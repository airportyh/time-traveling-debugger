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
            set_error(i, "Step failed on line %d - %s", __LINE__, sqlite3_errmsg(db));\
            return 1;                                            \
        }                                                        \
    }                                                            \

