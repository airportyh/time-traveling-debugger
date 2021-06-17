// Code/idea taken from: https://www.lemoda.net/c/sqlite-insert/
// These helpers assume that the surrounding function returns an error code,
// and that "db" is an accessible sqlite3 * variable.
#define SQLITE(f)                                                          \
    {                                                                      \
        int _i_;                                                             \
        _i_ = sqlite3_ ## f;                                                 \
        if (_i_ != SQLITE_OK) {                                              \
            set_error(_i_, "%s failed with status %d on line %d: %s\n",      \
                     #f, _i_, __LINE__, sqlite3_errmsg(db));                 \
            return 1;                                                      \
        }                                                                  \
    }                                                                      \

#define SQLITE_STEP(stmt)                                        \
    {                                                            \
        int _i_;                                                   \
        _i_ = sqlite3_step(stmt);                                  \
        if (_i_ != SQLITE_DONE) {                                  \
            set_error(_i_, "Step failed on line %d - %s", __LINE__, sqlite3_errmsg(db));\
            return 1;                                            \
        }                                                        \
    }                                                            \

