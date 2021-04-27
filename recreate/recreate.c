/*
TODO
====

* closures (freevars / cellvars)
    * new_cell
    * store_deref
* lists
    * review list log methods
    * list_append
    * list_extend
    * list_store_index
    * list_resize_and_shift
    * list_store_subscript_slice ?
    * list_delete_subscript
    * list_delete_subscript_slice
    * list_insert ?
    * list_remove ?
    * list_pop ?
    * list_clear ?
    * list_reverse ?
    * list_sort ?
* string
    * string_inplace_add_result
* dict
    * new_derived_dict
    * dict_delete_subscript
    * dict_clear ?
    * dict_pop ?
    * dict_pop_item ?
    * dict_set_default ?
    * dict_replace ?
* set
    * new_set
    * set_update
    * set_add
    * set_clear
    * set_discard
* object
    * object_assoc_dict
* exceptions
* tuples
    * new_tuple
* generators
    * yield_value
* change store fast to use array instead of dict
* organize code better?
* bring in uthash.h - convert it into a .c file
*/

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>
#include <sqlite3.h>
#include <errno.h>
#include <unistd.h>
#include "errors.h"
#include "uthash.h"

typedef struct _CodeFile {
    unsigned long id;
    char *filename;
    UT_hash_handle hh;
} CodeFile;

typedef struct _AddrRef {
    unsigned long addr;
    unsigned long id;
    UT_hash_handle hh;
} AddrRef;

typedef struct _FunHandler {
    char *funName;
    int (*fun)(char *line, unsigned int pos);
    UT_hash_handle hh;
} FunHandler;

typedef struct _MemberMapKey {
    unsigned long container;
    long key;
} MemberMapKey;

typedef struct _MemberMapEntry {
    MemberMapKey key;
    unsigned long ref;
    UT_hash_handle hh;
} MemberMapEntry;

typedef struct _FunCode {
    unsigned long id;
    unsigned long addr;
    // TODO local varnames
    char **localVarnames;
    int numLocals;
    UT_hash_handle hh;
} FunCode;

typedef struct _StrToIdEntry {
    char *str;
    unsigned long id;
    UT_hash_handle hh;
} StrToIdEntry;

typedef struct _FunCall {
    unsigned long id;
    FunCode *funCode;
    unsigned long localsId;
    unsigned long globalsId;
    // TODO cellvars and freevars
    struct _FunCall *parent;
} FunCall;

#define STR_TYPE 1
#define INT_TYPE 2
#define NONE_TYPE 3
#define BOOL_TYPE 4
#define ADDR_TYPE 5

typedef struct _AnyValue {
    char type;
    union {
        struct {
            char *chars;
            int length;
        } str;
        long number;
        bool boolean;
        unsigned long addr;
    };
} AnyValue;

// <Global State>

// The database
sqlite3 *db;

// File parser state
char *filename;
FILE *file;
char *sqlite_filename;
char *line = NULL;
size_t lineLen = 0;
unsigned int line_no = 1;

// verbose flag
bool verbose;

// Auto-generated unique IDs
char typeId = 1;
unsigned long snapshotId = 1;
unsigned long valueId = 1;
unsigned long codeFileId = 1;
unsigned long funCodeId = 1;
unsigned long funCallId = 1;

// Stack
FunCall *stack = NULL;

// Specific type ids
char intTypeId;
char strTypeId;
char boolTypeId;
char listTypeId;
char dictTypeId;
char moduleTypeId;
char objectTypeId;
char functionTypeId;
char noneTypeId;
char refTypeId;
char deletedTypeId;

// Specific value ids
unsigned long retvalId;

// Prepared statements
sqlite3_stmt *insertSnapshotStmt = NULL;
sqlite3_stmt *insertValueStmt = NULL;
sqlite3_stmt *insertFunCodeStmt = NULL;
sqlite3_stmt *insertFunCallStmt = NULL;
sqlite3_stmt *insertCodeFileStmt = NULL;
sqlite3_stmt *insertTypeStmt = NULL;
sqlite3_stmt *insertMemberStmt = NULL;
sqlite3_stmt *updateSnapshotStartFunCallStmt = NULL;

// Hashtables
CodeFile *code_files = NULL;
FunCode *funCodes = NULL;
AddrRef *addrToId = NULL;
FunHandler *funLookup = NULL;
MemberMapEntry *memberMap = NULL;
StrToIdEntry *strToId = NULL;

// </Global State>

// Convinience macros
#define RETURN_PARSE_ERROR(pos) \
set_error(1, "Parse Error on line %d column %d (%s:%d).\n", line_no, pos + 1, __FILE__, __LINE__); \
return 1;

// Code/idea taken from: https://www.lemoda.net/c/sqlite-insert/
// These helpers assume that the surrounding function returns an error code,
// and that "db" is an accessible sqlite3 * variable.
#define SQLITE(f)                                                          \
    {                                                                      \
        int i;                                                             \
        i = sqlite3_ ## f;                                                 \
        if (i != SQLITE_OK) {                                              \
            set_error(i, "%s failed with status %d on line %d: %s\n",      \
                     #f, i, __LINE__, sqlite3_errmsg(db));                 \
            return 1;                                                      \
        }                                                                  \
    }                                                                      \

#define SQLITE_STEP(stmt)                                        \
    {                                                            \
        int i;                                                   \
        i = sqlite3_step(stmt);                                  \
        if (i != SQLITE_DONE) {                                  \
            set_error(i, "Step failed - %s", sqlite3_errmsg(db));\
            return 1;                                            \
        }                                                        \
    }                                                            \

static inline int parseLongArg(int *i, long *value) {
    int pos;
    if (sscanf(line + (*i), "%ld%n", value, &pos) == 1) {
        (*i) += pos;
    } else {
        RETURN_PARSE_ERROR(*i);
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

static inline int parseULongArg(int *i, long *value) {
    int pos;
    if (sscanf(line + (*i), "%lu%n", value, &pos) == 1) {
        (*i) += pos;
    } else {
        RETURN_PARSE_ERROR(*i);
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

static inline int parseAddrArg(int *i, long *value) {
    int pos;
    if (sscanf(line + (*i), "*%lu%n", value, &pos) == 1) {
        (*i) += pos;
    } else {
        RETURN_PARSE_ERROR(*i);
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

static inline int parseIntArg(int *i, int *value) {
    int pos;
    if (sscanf(line + (*i), "%d%n", value, &pos) == 1) {
        (*i) += pos;
    } else {
        RETURN_PARSE_ERROR(*i);
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

static inline int parseStringArg(int *ii, char **string, int *strLength) {
    int string_start;
    int i = *ii;
    if (line[i] == '\'') {
        // parse a string surrounded by 's
        i++;
        string_start = i;
        while (line[i] != '\'' && line[i] != '\0') {
            i++;
        }
        if (line[i] == '\0') {
            RETURN_PARSE_ERROR(i);
        }
        i++;
    } else if (line[i] == '"') {
        // parse a string surrounded by "s
        i++;
        string_start = i;
        while (line[i] != '"' && line[i] != '\0') {
            i++;
        }
        if (line[i] == '\0') {
            RETURN_PARSE_ERROR(i);
        }
        i++;
    }

    (*strLength) = i - string_start - 1;
    (*string) = line + string_start;

    if (line[i] == ',') {
        i++;
        if (line[i] == ' ') {
            i++;
        }
    }

    (*ii) = i;

    return 0;
}

static inline int parseAnyArg(int *i, AnyValue *value) {
    char chr = line[*i];
    if (chr == '\'' || chr == '"') {
        char *string;
        int strLength;
        CALL(parseStringArg(i, &string, &strLength));
        value->type = STR_TYPE;
        value->str.chars = string;
        value->str.length = strLength;
    } else if (chr >= 48 && chr <= 57 || chr == 45) { // digit or '-'
        long number;
        CALL(parseLongArg(i, &number));
        value->type = INT_TYPE;
        value->number = number;
    } else if (strncmp(line + (*i), "True", 4) == 0) {
        value->type = BOOL_TYPE;
        value->boolean = 1;
        (*i) += 4;
    } else if (strncmp(line + (*i), "False", 5) == 0) {
        value->type = BOOL_TYPE;
        value->boolean = 1;
        (*i) += 5;
    } else if (strncmp(line + (*i), "None", 4) == 0) {
        value->type = NONE_TYPE;
        (*i) += 4;
    } else if (chr == '*') {
        long addr;
        (*i)++;
        CALL(parseULongArg(i, &addr));
        value->type = ADDR_TYPE;
        value->addr = addr;
    } else {
        RETURN_PARSE_ERROR(i);
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

int addType(char *typename, char *tid) {
    *tid = typeId++;

    SQLITE(bind_int(insertTypeStmt, 1, *tid));
    SQLITE(bind_text(insertTypeStmt, 2, typename, -1, SQLITE_STATIC));
    SQLITE_STEP(insertTypeStmt);
    SQLITE(reset(insertTypeStmt));

    return 0;
}

int readFile(char *filename, char **fileContents) {
    // https://stackoverflow.com/a/14002993

    FILE *f = fopen(filename, "r");
    if (f == NULL) {
        set_error(1, "%s", strerror(errno));
        return 1;
    }
    CALL(fseek(f, 0, SEEK_END));
    long fsize = ftell(f);
    CALL(fseek(f, 0, SEEK_SET));  /* same as rewind(f); */

    char *string = malloc(fsize + 1);
    int read = fread(string, 1, fsize, f);
    CALL(fclose(f));

    string[read] = 0;
    *fileContents = string;
    return 0;
}

int loadCodeFile(char *filename, int filenameLen, unsigned long *id) {
    CodeFile *code_file;

    HASH_FIND(hh, code_files, filename, filenameLen, code_file);
    if (code_file == NULL) {
        // Add code file entry
        // TODO: check for malloc not working
        code_file = (CodeFile *)malloc(sizeof(CodeFile));
        memset(code_file, 0, sizeof(CodeFile));
        code_file->id = codeFileId++;
        *id = code_file->id;
        code_file->filename = (char *)malloc(sizeof(char) * (filenameLen + 1));
        strncpy(code_file->filename, filename, filenameLen);
        code_file->filename[filenameLen] = '\0';
        HASH_ADD_KEYPTR(hh, code_files, code_file->filename, filenameLen, code_file);
        if (verbose) {
            printf("Added code file: %s with id %ld\n", code_file->filename, code_file->id);
        }

        char *fileContents;
        CALL(readFile(code_file->filename, &fileContents));

        SQLITE(bind_int64(insertCodeFileStmt, 1, code_file->id));
        SQLITE(bind_text(insertCodeFileStmt, 2, code_file->filename, -1, SQLITE_STATIC));
        SQLITE(bind_text(insertCodeFileStmt, 3, fileContents, -1, SQLITE_STATIC));
        SQLITE_STEP(insertCodeFileStmt);
        SQLITE(reset(insertCodeFileStmt));

        free(fileContents);
    } else {
        *id = code_file->id;
    }

    return 0;
}

unsigned long getValueId(unsigned long addr) {
    AddrRef *addrRef;
    HASH_FIND_INT(addrToId, &addr, addrRef);
    if (addrRef == NULL) {
        addrRef = (AddrRef *)malloc(sizeof(AddrRef));
        memset(addrRef, 0, sizeof(AddrRef));
        addrRef->addr = addr;
        addrRef->id = valueId++;
        HASH_ADD_INT(addrToId, addr, addrRef);
    }
    return addrRef->id;
}

int insertBoolValue(unsigned long id, char typeId, 
    unsigned long versionId, char value) {
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, typeId));
    SQLITE(bind_int64(insertValueStmt, 3, versionId));
    SQLITE(bind_int(insertValueStmt, 4, value));
    SQLITE_STEP(insertValueStmt);
    SQLITE(reset(insertValueStmt));

    return 0;
}

int insertLongValue(unsigned long id, char typeId, 
    unsigned long versionId, long value) {
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, typeId));
    SQLITE(bind_int64(insertValueStmt, 3, versionId));
    SQLITE(bind_int64(insertValueStmt, 4, value));
    SQLITE_STEP(insertValueStmt);
    SQLITE(reset(insertValueStmt));

    return 0;
}

int insertULongValue(unsigned long id, char typeId, 
    unsigned long versionId, unsigned long value) {
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, typeId));
    SQLITE(bind_int64(insertValueStmt, 3, versionId));
    SQLITE(bind_int64(insertValueStmt, 4, value));
    SQLITE_STEP(insertValueStmt);
    SQLITE(reset(insertValueStmt));

    return 0;
}

int insertNullValue(unsigned long id, char typeId, 
    unsigned long versionId) {
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, typeId));
    SQLITE(bind_int64(insertValueStmt, 3, versionId));
    SQLITE(bind_null(insertValueStmt, 4));
    SQLITE_STEP(insertValueStmt);
    SQLITE(reset(insertValueStmt));

    return 0;
}

int insertStringValue(unsigned long id, char typeId, 
    unsigned long versionId, AnyValue *value) {
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, typeId));
    SQLITE(bind_int64(insertValueStmt, 3, versionId));
    SQLITE(bind_text(insertValueStmt, 4, value->str.chars, value->str.length, SQLITE_STATIC));
    SQLITE_STEP(insertValueStmt);
    SQLITE(reset(insertValueStmt));

    return 0;
}

int getTypeByValue(AnyValue *value, char *typeId) {
    if (value->type == NONE_TYPE) {
        *typeId = noneTypeId;
    } else if (value->type == INT_TYPE) {
        *typeId = intTypeId;
    } else {
        set_error(1, "Unsupported type: %d", value->type);
        return 1;
    }
    return 0;
}

int getRefId(unsigned long dictId, unsigned long keyId, unsigned long version, unsigned long *refId) {
    MemberMapEntry *entry;
    MemberMapKey key;
    key.container = dictId;
    key.key = keyId;
    HASH_FIND(hh, memberMap, &key, sizeof(MemberMapKey), entry);
    if (entry != NULL) {
        *refId = entry->ref;
    } else {
        *refId = valueId++;
        SQLITE(bind_int64(insertMemberStmt, 1, dictId));
        SQLITE(bind_int64(insertMemberStmt, 2, keyId));
        SQLITE(bind_int64(insertMemberStmt, 3, *refId));
        SQLITE_STEP(insertMemberStmt);
        SQLITE(reset(insertMemberStmt));
        entry = (MemberMapEntry *)malloc(sizeof(MemberMapEntry));
        memset(entry, 0, sizeof(MemberMapEntry));
        entry->key.container = dictId;
        entry->key.key = keyId;
        entry->ref = *refId;
        HASH_ADD(hh, memberMap, key, sizeof(MemberMapKey), entry);
    }
    return 0;
}

int setItem(unsigned long dictId, AnyValue *key, AnyValue *value, unsigned long version) {
    unsigned long keyId;
    unsigned long valueId;
    if (key->type == ADDR_TYPE) {
        AddrRef *keyAddrRef;
        HASH_FIND_INT(addrToId, &key->addr, keyAddrRef);
        if (keyAddrRef == NULL) {
            set_error(1, "Lookup error for addrToId[%lu]", key->addr);
            return 1;
        }
        keyId = keyAddrRef->id;
    } else if (key->type == INT_TYPE) {
        keyId = key->number;
    } else {
        set_error(1, "Unsupported key type: %d", key->type);
        return 1;
    }
    unsigned long refId;
    CALL(getRefId(dictId, keyId, version, &refId));

    switch (value->type) {
        case STR_TYPE:
            CALL(insertStringValue(refId, strTypeId, version, value));
            break;
        case INT_TYPE:
            CALL(insertLongValue(refId, intTypeId, version, value->number));
            break;
        case NONE_TYPE:
            CALL(insertNullValue(refId, noneTypeId, version));
            break;
        case BOOL_TYPE:
            CALL(insertBoolValue(refId, boolTypeId, version, value->boolean));
            break;
        case ADDR_TYPE:
            {
                AddrRef *valueAddrRef;
                HASH_FIND_INT(addrToId, &value->addr, valueAddrRef);
                if (valueAddrRef == NULL) {
                    set_error(1, "Lookup error for addrToId[%lu]", value->addr);
                    return 1;
                }
                valueId = valueAddrRef->id;

                unsigned long refId;
                CALL(getRefId(dictId, keyId, version, &refId));
                CALL(insertULongValue(refId, refTypeId, version, valueId));
                break;
            }
    }

    return 0;

}

int addString(unsigned long id, char *string, int strLength) {
    if (strLength == -1) {
        strLength = strlen(string);
    }
    SQLITE(bind_int64(insertValueStmt, 1, id));
    SQLITE(bind_int(insertValueStmt, 2, strTypeId));
    SQLITE(bind_int64(insertValueStmt, 3, snapshotId));
    SQLITE(bind_text(insertValueStmt, 4, string, strLength, SQLITE_STATIC));
    SQLITE_STEP(insertValueStmt);
    if (verbose) {
        printf("Inserting new string succeeded!\n");
    }
    SQLITE(reset(insertValueStmt));

    return 0;
}

int seedData() {
    CALL(addType("int", &intTypeId));
    CALL(addType("str", &strTypeId));
    CALL(addType("bool", &boolTypeId));
    CALL(addType("list", &listTypeId));
    CALL(addType("dict", &dictTypeId));
    CALL(addType("module", &moduleTypeId));
    CALL(addType("object", &objectTypeId));
    CALL(addType("function", &functionTypeId));
    CALL(addType("none", &noneTypeId));
    CALL(addType("<ref>", &refTypeId));
    CALL(addType("<deleted>", &deletedTypeId));

    retvalId = valueId++;
    CALL(addString(retvalId, "<ret val>", -1));

    return 0;
}

int setLocal(int idx, AnyValue *value, unsigned long version) {
    if (stack == NULL) {
        set_error(1, "Stack is empty");
        return 1;
    }
    FunCode *funCode = stack->funCode;
    if (idx >= funCode->numLocals) {
        set_error(1, "Local variable index out of bounds: %d of %d", idx, funCode->numLocals);
        return 1;
    }
    char *varname = funCode->localVarnames[idx];
    StrToIdEntry *entry = NULL;
    HASH_FIND_STR(strToId, varname, entry);
    unsigned long key;
    if (entry != NULL) {
        key = entry->id;
    } else {
        key = valueId++;
        CALL(addString(key, varname, -1));
        
        entry = (StrToIdEntry *)malloc(sizeof(StrToIdEntry));
        entry->str = varname;
        entry->id = key;
        HASH_ADD_KEYPTR(hh, strToId, varname, strlen(varname), entry);
    }

    AnyValue keyValue;
    keyValue.type = INT_TYPE;
    keyValue.number = key;
    CALL(setItem(stack->localsId, &keyValue, value, version));

    return 0;
}

int processBasedir(char *line, unsigned int pos) {
    return 0;
}

int processNewCode(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    char *filename;
    int filenameLen;
    CALL(parseStringArg(&i, &filename, &filenameLen));

    unsigned long codeFileId;
    CALL(loadCodeFile(filename, filenameLen, &codeFileId));

    char *funName;
    int funNameLen;
    CALL(parseStringArg(&i, &funName, &funNameLen));
    int line_no;
    CALL(parseIntArg(&i, &line_no));

    // TODO: local var names, free and cell var names
    int numLocals;
    CALL(parseIntArg(&i, &numLocals));
    char **localVarnames = NULL;
    
    int localsCSVLen = 0;
    char *localsCSV = NULL;
    if (numLocals > 0) {
        localVarnames = (char **)malloc(sizeof(char *) * numLocals);
        for (int j = 0; j < numLocals; j++) {
            char *paramName;
            int paramNameLen;
            CALL(parseStringArg(&i, &paramName, &paramNameLen));
            localsCSVLen += paramNameLen;
            if (j != 0) {
                localsCSVLen++;
            }
            char *paramNameCopy = (char *)malloc(sizeof(char) * (paramNameLen + 1));
            strncpy(paramNameCopy, paramName, paramNameLen);
            paramNameCopy[paramNameLen] = '\0';
            localVarnames[j] = paramNameCopy;
        }

        localsCSV = (char *)malloc(sizeof(char) * (localsCSVLen + 1));
        int cursor = 0;
        for (int j = 0; j < numLocals; j++) {
            if (j != 0) {
                localsCSV[cursor] = ',';
                cursor++;
            }
            int len = strlen(localVarnames[j]);
            strncpy(localsCSV + cursor, localVarnames[j], len);
            cursor += len;
        }
        localsCSV[cursor] = '\0';
    }

    unsigned long id = funCodeId++;
    SQLITE(bind_int64(insertFunCodeStmt, 1, id));
    SQLITE(bind_text(insertFunCodeStmt, 2, funName, funNameLen, SQLITE_STATIC));
    SQLITE(bind_int64(insertFunCodeStmt, 3, codeFileId));
    SQLITE(bind_int(insertFunCodeStmt, 4, line_no));

    if (localsCSV == NULL) {
        SQLITE(bind_null(insertFunCodeStmt, 5));
    } else {
        SQLITE(bind_text(insertFunCodeStmt, 5, localsCSV, -1, SQLITE_STATIC));
    }
    SQLITE(bind_null(insertFunCodeStmt, 6));
    SQLITE(bind_null(insertFunCodeStmt, 7));

    SQLITE_STEP(insertFunCodeStmt);
    SQLITE(reset(insertFunCodeStmt));

    if (localsCSV) {
        free(localsCSV);
    }

    FunCode *funCode = (FunCode *)malloc(sizeof(FunCode));
    memset(funCode, 0, sizeof(FunCode));
    funCode->id = id;
    funCode->addr = addr;
    funCode->localVarnames = localVarnames;
    funCode->numLocals = numLocals;
    HASH_ADD_INT(funCodes, addr, funCode);

    return 0;
}

int processPushFrame(char *line, unsigned int i) {
    unsigned long codeHeapId;
    CALL(parseULongArg(&i, &codeHeapId));

    FunCode *funCode;
    HASH_FIND_INT(funCodes, &codeHeapId, funCode);
    if (funCode == NULL) {
        set_error(1, "Cannot found fun code for addr %lu", codeHeapId);
        return 1;
    }

    unsigned long globalVarsId;
    CALL(parseULongArg(&i, &globalVarsId));
    unsigned long localVarsId;
    CALL(parseULongArg(&i, &localVarsId));
    unsigned long globalsId = getValueId(globalVarsId);
    unsigned long localsId = valueId++;
    unsigned long callId = funCallId++;
    
    FunCall *funCall = (FunCall *)malloc(sizeof(FunCall));
    memset(funCall, 0, sizeof(FunCall));
    funCall->id = callId;
    funCall->funCode = funCode;
    funCall->localsId = localsId;
    funCall->globalsId = globalsId;
    funCall->parent = stack;

    stack = funCall;

    CALL(insertNullValue(localsId, dictTypeId, snapshotId));
    
    for (int j = 0; j < funCode->numLocals; j++) {
        AnyValue arg;
        CALL(parseAnyArg(&i, &arg));
        CALL(setLocal(j, &arg, snapshotId));
    }

    SQLITE(bind_int64(updateSnapshotStartFunCallStmt, 1, funCall->id));
    SQLITE(bind_int64(updateSnapshotStartFunCallStmt, 2, snapshotId));
    SQLITE_STEP(updateSnapshotStartFunCallStmt);
    SQLITE(reset(updateSnapshotStartFunCallStmt));

    SQLITE(bind_int64(insertFunCallStmt, 1, callId));
    SQLITE(bind_int64(insertFunCallStmt, 2, funCode->id));
    SQLITE(bind_int64(insertFunCallStmt, 3, localsId));
    SQLITE(bind_int64(insertFunCallStmt, 4, globalsId));
    SQLITE(bind_null(insertFunCallStmt, 5)); // TODO cellvars
    SQLITE(bind_null(insertFunCallStmt, 6)); // TODO freevars
    if (funCall->parent) {
        SQLITE(bind_int64(insertFunCallStmt, 7, funCall->parent->id));
    } else {
        SQLITE(bind_null(insertFunCallStmt, 7));
    }
    SQLITE_STEP(insertFunCallStmt);
    SQLITE(reset(insertFunCallStmt));

    return 0;
}

int processPopFrame(char *line, unsigned int pos) {
    if (stack) {
        FunCall *parent = stack->parent;
        free(stack);
        stack = parent;
    } else {
        set_error(1, "Tried to pop empty stack.");
        return 1;
    }
    return 0;
}

int processNewString(char *line, unsigned int i) {
    long addr;
    CALL(parseLongArg(&i, &addr));
    char *string;
    int strLength;
    CALL(parseStringArg(&i, &string, &strLength));

    if (verbose) {
        printf("str: %.*s\n", strLength, string);
    }

    unsigned long id = getValueId(addr);
    CALL(addString(id, string, strLength));
    
    return 0;
}

int processNewObject(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    char *typeName;
    int typeNameLen;
    CALL(parseStringArg(&i, &typeName, &typeNameLen));
    unsigned long typeAddr;
    CALL(parseAddrArg(&i, &typeAddr));
    unsigned long oid = getValueId(addr);
    unsigned long dictAddr = 0;
    // dictAddr is optional, so we can ignore failure
    // below
    parseULongArg(&i, &dictAddr);
    unsigned long dictId = 0;
    if (dictAddr) {
        dictId = getValueId(dictAddr);
    }

    unsigned long id = valueId++;
    CALL(insertULongValue(id, objectTypeId, snapshotId, dictId));
    
    return 0;
}

int processNewDict(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    unsigned long dictId = getValueId(addr);
    CALL(insertNullValue(dictId, dictTypeId, snapshotId));

    AnyValue key;
    AnyValue value;
    while (true) {
        if (parseAnyArg(&i, &key) == 0) {
            CALL(parseAnyArg(&i, &value));
            CALL(setItem(dictId, &key, &value, snapshotId));
        } else {
            clear_error();
            break;
        }
    }

    return 0;
}

int processDictStoreSubscript(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    AnyValue key;
    AnyValue value;
    CALL(parseAnyArg(&i, &key));
    CALL(parseAnyArg(&i, &value));

    unsigned long dictId = getValueId(addr);
    CALL(setItem(dictId, &key, &value, snapshotId));

    return 0;
}

int processNewModule(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    unsigned long id = getValueId(addr);
    CALL(insertNullValue(id, moduleTypeId, snapshotId));
    return 0;
}

int processNewFunction(char *line, unsigned int i) {
    unsigned long addr;
    CALL(parseULongArg(&i, &addr));
    unsigned long codeHeapId;
    CALL(parseULongArg(&i, &codeHeapId));
    FunCode *funCode;
    HASH_FIND_INT(funCodes, &codeHeapId, funCode);

    if (funCode == NULL) {
        set_error(1, "Fun code not found for %lu", codeHeapId);
        return 1;
    }

    unsigned long id = getValueId(addr);
    CALL(insertULongValue(id, functionTypeId, snapshotId, funCode->id));

    return 0;
}

int processCallStart(char *l, unsigned int i) {
    ssize_t read;
    read = getline(&line, &lineLen, file);
    if (read == -1) {
        set_error(1, "EOF reached after CALL_START");
        return 1;
    }
    if (strncmp("CALL_END", line, 8) == 0) {
        SQLITE(bind_int(updateSnapshotStartFunCallStmt, 1, 0));
        SQLITE(bind_int(updateSnapshotStartFunCallStmt, 2, snapshotId));
        SQLITE_STEP(updateSnapshotStartFunCallStmt);
        SQLITE(reset(updateSnapshotStartFunCallStmt));
    } else if (strncmp("PUSH_FRAME", line, 10) == 0) {
        i = 10;
        if (line[i] != '(') {
            RETURN_PARSE_ERROR(i);
        }
        CALL(processPushFrame(line, i + 1))
    } else {
        set_error(1, "Unexpected event on line %d: %s", line_no, line);
        return 1;
    }

    return 0;
}

int processCallEnd(char *line, unsigned int i) {
    return 0;
}

int processVisit(char *line, unsigned int i) {
    // parse a number
    long num;
    CALL(parseLongArg(&i, &num));

    unsigned long id = snapshotId++;
    SQLITE(bind_int(insertSnapshotStmt, 1, id));
    if (stack) {
        SQLITE(bind_int64(insertSnapshotStmt, 2, stack->id));
    } else {
        SQLITE(bind_null(insertSnapshotStmt, 2));
    }
    SQLITE(bind_null(insertSnapshotStmt, 3));
    SQLITE(bind_int(insertSnapshotStmt, 4, num));
    SQLITE_STEP(insertSnapshotStmt);
    if (verbose) {
        printf("Visiting line %ld succeeded!\n", num);
    }
    SQLITE(reset(insertSnapshotStmt));
    return 0;
}

int processReturnValue(char *line, unsigned int i) {
    AnyValue value;
    CALL(parseAnyArg(&i, &value));
    AnyValue key;
    key.type = INT_TYPE;
    key.number = retvalId;

    CALL(setItem(
        stack->localsId,
        &key,
        &value,
        snapshotId
    ));
    return 0;
}

int processStoreFast(char *line, unsigned int i) {
    int idx;
    CALL(parseIntArg(&i, &idx));
    AnyValue value;
    CALL(parseAnyArg(&i, &value));
    CALL(setLocal(idx, &value, snapshotId));

    return 0;
}

int registerFun(char *fun_name, int (*fun)(char *line, unsigned int pos)) {
    FunHandler *handler;
    handler = (FunHandler *)malloc(sizeof(FunHandler));
    handler->funName = fun_name;
    handler->fun = fun;
    HASH_ADD_KEYPTR(hh, funLookup, fun_name, strlen(fun_name), handler);

    return 0;
}

void registerFuns() {
    registerFun("REWIND_BASEDIR", processBasedir);
    registerFun("NEW_CODE", processNewCode);
    registerFun("VISIT", processVisit);
    registerFun("PUSH_FRAME", processPushFrame);
    registerFun("NEW_STRING", processNewString);
    registerFun("NEW_OBJECT", processNewObject);
    registerFun("NEW_DICT", processNewDict);
    registerFun("NEW_MODULE", processNewModule);
    registerFun("DICT_STORE_SUBSCRIPT", processDictStoreSubscript);
    registerFun("RETURN_VALUE", processReturnValue);
    registerFun("POP_FRAME", processPopFrame);
    registerFun("NEW_FUNCTION", processNewFunction);
    registerFun("CALL_START", processCallStart);
    registerFun("CALL_END", processCallEnd);
    registerFun("STORE_FAST", processStoreFast);
}

int prepareStatements() {
    SQLITE(prepare_v2(db, "insert into Snapshot values (?, ?, ?, ?)", -1, &insertSnapshotStmt, NULL));
    SQLITE(prepare_v2(db, "insert into Value values (?, ?, ?, ?)", -1, &insertValueStmt, NULL));
    SQLITE(prepare_v2(db, "insert into FunCode values (?, ?, ?, ?, ?, ?, ?)", -1, &insertFunCodeStmt, NULL));
    SQLITE(prepare_v2(db, "insert into FunCall values (?, ?, ?, ?, ?, ?, ?)", -1, &insertFunCallStmt, NULL));
    SQLITE(prepare_v2(db, "insert into CodeFile values (?, ?, ?)", -1, &insertCodeFileStmt, NULL));
    SQLITE(prepare_v2(db, "insert into Type values (?, ?)", -1, &insertTypeStmt, NULL));
    SQLITE(prepare_v2(db, "insert into Member values(?, ?, ?)", -1, &insertMemberStmt, NULL));
    SQLITE(prepare_v2(db, "update Snapshot set start_fun_call_id = ? where id = ?", -1, &updateSnapshotStartFunCallStmt, NULL));
    return 0;
}

int finalizeStatements() {
    CALL(sqlite3_finalize(insertSnapshotStmt));
    CALL(sqlite3_finalize(insertValueStmt));
    CALL(sqlite3_finalize(insertFunCodeStmt));
    CALL(sqlite3_finalize(insertFunCallStmt));
    CALL(sqlite3_finalize(insertCodeFileStmt));
    CALL(sqlite3_finalize(insertTypeStmt));
    CALL(sqlite3_finalize(insertMemberStmt));
    CALL(sqlite3_finalize(updateSnapshotStartFunCallStmt));
    return 0;
}

// https://ben-bai.blogspot.com/2013/03/c-string-startswith-endswith-indexof.html
bool endsWith (char* base, char* str) {
    int blen = strlen(base);
    int slen = strlen(str);
    return (blen >= slen) && (0 == strcmp(base + blen - slen, str));
}

int processEvent(char *line, int line_no) {
    int i = 0;
    while (true) {
        char chr = line[i];
        if (!((chr >= 65 && chr <= 90) || chr == 95)) { // [A-Z_]
            break;
        }
        i++;
    }

    if (line[i] != '(') {
        RETURN_PARSE_ERROR(i);
    }
    
    FunHandler *handler;
    HASH_FIND(hh, funLookup, line, i, handler);
    if (handler == NULL) {
        fprintf(stderr, "No process function found for %.*s\n", i, line);
        return 1;
    }
    return handler->fun(line, i + 1);
}

int createSchema() {
    char *contents;
    CALL(readFile("schema.sql", &contents));
    SQLITE(exec(db, contents, NULL, 0, NULL));

    return 0;
}

int main(int argc, char *argv[]) {
    ssize_t read;

    atexit(finalize_error);

    if (argc < 2 || !endsWith(filename = argv[1], ".rewind")) {
        printf("Please provide a .rewind file\n");
        return 1;
    }

    if (argc >= 3 && strcmp(argv[2], "verbose") == 0) {
        verbose = true;
    }

    registerFuns();

    if (verbose) {
        printf("Processing %s...\n", filename);
    }

    file = fopen(filename, "r");

    if (file == NULL) {
        printf("Could not open %s.\n", filename);
        return 1;
    }

    // Calculate SQLite filename name.
    sqlite_filename = (char *)malloc(sizeof(char) * (strlen(filename) + 1));
    strncpy(sqlite_filename, filename, strlen(filename) - 7);
    strcpy(sqlite_filename + strlen(filename) - 7, ".sqlite");

    if (verbose) {
        printf("Opening SQLite file %s\n", sqlite_filename);
    }

    // Remove the database file if it's already there.
    if(access(sqlite_filename, F_OK) == 0) {
        CALL(remove(sqlite_filename));
    }

    SQLITE(open(sqlite_filename, &db));

    CALL(createSchema());
    CALL(prepareStatements());
    CALL(seedData());
    
    if (verbose) {
        printf("Opened SQLite database.\n");
    }

    // SQLITE(exec(db, "PRAGMA journal_mode=off;", NULL, 0, NULL));
    // SQLITE(exec(db, "PRAGMA cache_size=-5000", NULL, 0, NULL));
    // SQLITE(exec(db, "PRAGMA journal_mode=WAL;", NULL, 0, NULL));
    // SQLITE(exec(db, "PRAGMA synchronous=off;", NULL, 0, NULL));
    // SQLITE(exec(db, "pragma temp_store = memory;", NULL, 0, NULL));
    // SQLITE(exec(db, "pragma mmap_size = 30000000000;", NULL, 0, NULL));

    SQLITE(exec(db, "begin transaction", NULL, 0, NULL));

    while (1) {
        read = getline(&line, &lineLen, file);
        if (read == -1) {
            break;
        }
        if (verbose) {
            printf("\nLine: %s", line);
        }
        if (processEvent(line, line_no) != 0) {
            break;
        }
        line_no++;

        // if (line_no % 600 == 0) {
        //     if (verbose) {
        //         printf("Line: %d\n", line_no);
        //     }
        //     SQLITE(exec(db, "end transaction", NULL, 0, NULL));
        //     SQLITE(exec(db, "begin transaction", NULL, 0, NULL));
        // }
    }

    SQLITE(exec(db, "end transaction", NULL, 0, NULL));

    if (line) {
        free(line);
    }

    free(sqlite_filename);
    CALL(finalizeStatements());
    CALL(sqlite3_close(db));
    CALL(fclose(file));
}