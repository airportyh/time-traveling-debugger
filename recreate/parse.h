#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include "errors.h"
#include "utstring.h"

#define STR_TYPE 1
#define INT_TYPE 2
#define NONE_TYPE 3
#define BOOL_TYPE 4
#define ADDR_TYPE 5
#define FLOAT_TYPE 6

#define RETURN_PARSE_ERROR(pos) \
set_error(1, "Parse Error on line %d column %lu (%s:%d).\n", logLineNo, pos + 1, __FILE__, __LINE__); \
return 1;

char *line = NULL;
unsigned int logLineNo = 1;

typedef struct _AnyValue {
    char type;
    union {
        struct {
            char *chars;
            int length;
        } str;
        long number;
        double doubleValue;
        bool boolean;
        unsigned long addr;
    };
} AnyValue;

static inline int makeStrCopy(char *str, int len, char **copy) {
    *copy = (char *)malloc(sizeof(char) * (len + 1));
    if (*copy == NULL) {
        set_error(1, "malloc failed for makeStrCopy");
        return 1;
    }
    strncpy(*copy, str, len);
    (*copy)[len] = '\0';
    return 0;
}

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

static inline int parseDoubleArg(int *i, double *value) {
    int pos;
    if (strncmp(line + (*i), "inf", 3) == 0) {
        *value = INFINITY;
    } else if (strncmp(line + (*i), "-inf", 4) == 0) {
        *value = -INFINITY;
    } else if (strncmp(line + (*i), "nan", 3) == 0) {
        *value = NAN;
    } else if (sscanf(line + (*i), "%lf%n", value, &pos) == 1) {
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
    } else {
        RETURN_PARSE_ERROR(i);
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
        long number;
        double doubleValue;
        int starti = *i;
        if (parseLongArg(i, &number) == 0) {
            value->type = INT_TYPE;
            value->number = number;
            if (line[*i] == '.') {
                // it's actually a float,
                // try again
                *i = starti;
                CALL(parseDoubleArg(i, &doubleValue));
                value->type = FLOAT_TYPE;
                value->doubleValue = doubleValue;
            }
        } else {
            clear_error();
            CALL(parseDoubleArg(i, &doubleValue));
            value->type = FLOAT_TYPE;
            value->doubleValue = doubleValue;
        }
    }

    if (line[*i] == ',') {
        (*i)++;
        if (line[*i] == ' ') {
            (*i)++;
        }
    }

    return 0;
}

static inline int parseVarStrArgs(unsigned int *i, char ***strs, int *numStrs, UT_string **strsCSV) {
    CALL(parseIntArg(i, numStrs));
    if (*numStrs > 0) {
        utstring_new(*strsCSV);
        *strs = (char **)malloc(sizeof(char *) * (*numStrs));
        for (int j = 0; j < (*numStrs); j++) {
            char *str;
            int strLen;
            CALL(parseStringArg(i, &str, &strLen));
            char *strCopy;
            CALL(makeStrCopy(str, strLen, &strCopy));
            (*strs)[j] = strCopy;

            utstring_printf(*strsCSV, "%s", strCopy);
            if (j < (*numStrs) - 1) {
                utstring_printf(*strsCSV, ",");
            }
        }
    }

    return 0;
}