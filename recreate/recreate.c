#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>
#include <sqlite3.h>

typedef struct HistoryRecreatorStruct {
    sqlite3 *db;
    bool log;
    unsigned long snapshotId;
} HistoryRecreator;

// Code for SuperFashHash is from http://www.azillionmonkeys.com/qed/hash.html
#include <stdint.h>
#undef get16bits
#if (defined(__GNUC__) && defined(__i386__)) || defined(__WATCOMC__) \
  || defined(_MSC_VER) || defined (__BORLANDC__) || defined (__TURBOC__)
#define get16bits(d) (*((const uint16_t *) (d)))
#endif

#if !defined (get16bits)
#define get16bits(d) ((((uint32_t)(((const uint8_t *)(d))[1])) << 8)\
                       +(uint32_t)(((const uint8_t *)(d))[0]) )
#endif

uint32_t SuperFastHash (const char * data, int len) {
uint32_t hash = len, tmp;
int rem;

    if (len <= 0 || data == NULL) return 0;

    rem = len & 3;
    len >>= 2;

    /* Main loop */
    for (;len > 0; len--) {
        hash  += get16bits (data);
        tmp    = (get16bits (data+2) << 11) ^ hash;
        hash   = (hash << 16) ^ tmp;
        data  += 2*sizeof (uint16_t);
        hash  += hash >> 11;
    }

    /* Handle end cases */
    switch (rem) {
        case 3: hash += get16bits (data);
                hash ^= hash << 16;
                hash ^= ((signed char)data[sizeof (uint16_t)]) << 18;
                hash += hash >> 11;
                break;
        case 2: hash += get16bits (data);
                hash ^= hash << 11;
                hash += hash >> 17;
                break;
        case 1: hash += (signed char)*data;
                hash ^= hash << 10;
                hash += hash >> 1;
    }

    /* Force "avalanching" of final 127 bits */
    hash ^= hash << 3;
    hash += hash >> 5;
    hash ^= hash << 4;
    hash += hash >> 17;
    hash ^= hash << 25;
    hash += hash >> 6;

    return hash;
}

int processBasedir(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processNewCode(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processPushFrame(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processPopFrame(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processNewString(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processNewObject(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processNewDict(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processDictStoreSubscript(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

int processNewModule(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

sqlite3_stmt *insertSnapshotStmt;
int processVisit(char *line, unsigned int pos, HistoryRecreator *recreator) {
    sqlite3 *db = recreator->db;
    bool log = recreator->log;
    // parse a number
    unsigned long num;
    if (sscanf(line + pos, "%ld", &num) == 1) {
        if (log) {
            printf("int: %ld\n", num);
        }
    } else {
        printf("Parse error on line %d column %d.\n", 4, pos + 1);
        return -1;
    }

    unsigned long id = recreator->snapshotId++;

    int code = sqlite3_bind_int(insertSnapshotStmt, 1, id);
    if (code != SQLITE_OK) {
        printf("Failed to bind 1st parameter for insert visit statement. Code %d\n", code);
        return 1;
    }

    code = sqlite3_bind_null(insertSnapshotStmt, 2);
    if (code != SQLITE_OK) {
        printf("Failed to bind 2nd parameter for insert visit statement. Code %d\n", code);
        return 1;
    }

    code = sqlite3_bind_null(insertSnapshotStmt, 3);
    if (code != SQLITE_OK) {
        printf("Failed to bind 3rd parameter for insert visit statement. Code %d\n", code);
        return 1;
    }

    code = sqlite3_bind_int(insertSnapshotStmt, 4, num);
    if (code != SQLITE_OK) {
        printf("Failed to bind 4th parameter for insert visit statement. Code %d\n", code);
        return 1;
    }

    if (sqlite3_step(insertSnapshotStmt) != SQLITE_DONE) {
        printf("Failed to perform insert visit statement: %s\n", sqlite3_errmsg(db));
        return 1;
    }
    
    if (log) {
        printf("Visiting line %ld succeeded!\n", num);
    }

    if (sqlite3_reset(insertSnapshotStmt) != SQLITE_OK) {
        printf("Failed to reset insert visit statement: %s\n", sqlite3_errmsg(db));
        return 1;
    }
    return 0;
}

int processReturnValue(char *line, unsigned int pos, HistoryRecreator *recreator) {
    return 0;
}

#define FUN_LOOKUP_SIZE 997

static int (*funLookup[FUN_LOOKUP_SIZE])(char *line, unsigned int pos, HistoryRecreator *recreator);

void registerFun(char *fun_name, int (*fun)(char *line, unsigned int pos, HistoryRecreator *recreator)) {
    int length = strlen(fun_name);
    unsigned int idx = SuperFastHash(fun_name, length) % FUN_LOOKUP_SIZE;
    funLookup[idx] = fun;
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
}

int prepareStatements(sqlite3 *db) {
    if (SQLITE_OK != sqlite3_prepare_v2(db, "insert into Snapshot values (?, ?, ?, ?)", -1, &insertSnapshotStmt, NULL)) {
        printf("Error preparing insert statement.\n");
        return 1;
    }
    return 0;
}

// https://ben-bai.blogspot.com/2013/03/c-string-startswith-endswith-indexof.html
bool endsWith (char* base, char* str) {
    int blen = strlen(base);
    int slen = strlen(str);
    return (blen >= slen) && (0 == strcmp(base + blen - slen, str));
}

// int parse(char *line, int line_no, bool log) {
//     // expect '('
//     if (line[i] == '(') {
//         i++;
//     } else {
//         printf("Parse failed on line %d column %d.\n", line_no, i + 1);
//         printf("    %s\n", line);
//         return 1;
//     }

//     // parse arguments
//     while (1) {
//         char chr = line[i];
//         if (chr == '\'') {
//             // parse a string surrounded by 's
//             i++;
//             int string_start = i;
//             while (line[i] != '\'' && line[i] != '\0') {
//                 i++;
//             }
//             if (line[i] == '\0') {
//                 printf("Unexpected end of line on line %d column %d.\n", line_no, i + 1);
//                 return 1;
//             }
//             if (log) {
//                 printf("str: %.*s\n", i - string_start, line + string_start);
//             }
//             i++;
//         } else if (chr == '"') {
//             // parse a string surrounded by "s
//             i++;
//             int string_start = i;
//             while (line[i] != '"' && line[i] != '\0') {
//                 i++;
//             }
//             if (line[i] == '\0') {
//                 printf("Unexpected end of line on line %d column %d.\n", line_no, i + 1);
//                 return 1;
//             }
//             if (log) {
//                 printf("str: %.*s\n", i - string_start, line + string_start);
//             }
//             i++;
//         } else if (chr == '*') {
//             i++;
//             long num;
//             int pos;
//             if (sscanf(line + i, "%ld%n", &num, &pos) == 1) {
//                 if (log) {
//                     printf("heap ref: %ld\n", num);
//                 }
//                 i += pos;
//             } else {
//                 printf("Parse error on line %d column %d.\n", line_no, i + 1);
//                 return 1;
//             }
//         } else if (chr == 'N') {
//             if (strncmp(line + i, "None", 4) == 0) {
//                 if (log) {
//                     printf("None\n");
//                 }
//                 i += 4;
//             } else {
//                 printf("Parse error on line %d column %d.\n", line_no, i + 1);
//                 return 1;
//             }
//         } else if (chr >= 48 && chr <= 57) {
//             // parse a number
//             long num;
//             int pos;
//             if (sscanf(line + i, "%ld%n", &num, &pos) == 1) {
//                 if (log) {
//                     printf("int: %ld\n", num);
//                 }
//                 i += pos;
//             } else {
//                 printf("Parse error on line %d column %d.\n", line_no, i + 1);
//                 return 1;
//             }
//         } else if (chr == ')') {
//             return 0;
//         } else {
//             printf("Parse error on line %d column %d.\n", line_no, i + 1);
//             return 1;
//         }
//         // Successfully parsed an arg, now parse a comma or closing paran.
//         if (line[i] == ')') {
//             return 0;
//         }
//         if (line[i] == ',') {
//             i++;
//             if (line[i] == ' ') {
//                 i++;
//             }
//             continue;
//         } else {
//             printf("Parse error on line %d column %d.\n", line_no, i + 1);
//             return 1;
//         }
//     }
// }

int processEvent(char *line, int line_no, HistoryRecreator *recreator) {
    int i = 0;
    while (true) {
        char chr = line[i];
        if (!((chr >= 65 && chr <= 90) || chr == 95)) { // [A-Z_]
            break;
        }
        i++;
    }

    if (line[i] != '(') {
        printf("Parse error on line %d column %d\n", line_no, i);
        return 1;
    }
    
    uint32_t hash = SuperFastHash(line, i);
    uint32_t index = hash % FUN_LOOKUP_SIZE;
    int (*fun)(char *line, unsigned int pos, HistoryRecreator *recreator) = funLookup[index];
    if (fun == NULL) {
        printf("No process function found for %.*s\n", i, line);
        return 1;
    }
    return fun(line, i + 1, recreator);
}

int main(int argc, char *argv[]) {
    char *filename;
    FILE *file;
    ssize_t read;
    size_t len;
    char * line = NULL;
    int line_no = 1;
    bool log = false;

    HistoryRecreator *recreator;
    char *sqlite_filename;
    sqlite3* db;


    if (argc < 2 || !endsWith(filename = argv[1], ".rewind")) {
        printf("Please provide a .rewind file\n");
        return 1;
    }

    if (argc >= 3 && strcmp(argv[2], "log") == 0) {
        log = true;
    }

    registerFuns();

    if (log) {
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

    if (log) {
        printf("Opening SQLite file %s\n", sqlite_filename);
    }

    if (sqlite3_open(sqlite_filename, &db) != SQLITE_OK) {
        printf("Error opening DB: %s\n", sqlite3_errmsg(db));
        free(sqlite_filename);
        return 1;
    }

    free(sqlite_filename);

    recreator = (HistoryRecreator *)malloc(sizeof(HistoryRecreator));
    recreator->log = log;
    recreator->db = db;
    recreator->snapshotId = 1;

    if (prepareStatements(db) != 0) {
        printf("Error preparing db statements: %s\n", sqlite3_errmsg(db));
        free(recreator);
        return 1;
    }
    
    if (log) {
        printf("Opened SQLite database.\n");
    }

    while (1) {
        read = getline(&line, &len, file);
        if (read == -1) {
            break;
        }
        if (log) {
            printf("\nLine: %s\n", line);
        }
        if (processEvent(line, line_no, recreator) != 0) {
            break;
        }
        line_no++;
    }

    if (line) {
        free(line);
    }

    sqlite3_finalize(insertSnapshotStmt);
    sqlite3_close(db);
    free(recreator);
    fclose(file);
}