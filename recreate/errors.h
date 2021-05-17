#define HARD_CALL(funcall) {                            \
    if (funcall != 0) {                                 \
        exit(1);                                        \
    }                                                   \

#define CALL(funcall)                                   \
    if (funcall != 0) {                                 \
        return 1;                                       \
    }

void set_error(int code, char *format, ...);
void clear_error();
bool has_error();
void print_error();
void finalize_error(void);