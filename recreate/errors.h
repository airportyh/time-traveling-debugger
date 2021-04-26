#include <stdarg.h>
#include <stdio.h>

int error_code = 0;
#define ERROR_MESSAGE_MAX_SIZE 200
char error_message[ERROR_MESSAGE_MAX_SIZE];

void set_error(int code, char *format, ...) {
    error_code = code;
    va_list args;
    va_start(args, format);
    vsnprintf(error_message, ERROR_MESSAGE_MAX_SIZE, format, args);
    error_message[ERROR_MESSAGE_MAX_SIZE - 1] = '\0';
    va_end(args);
}

void clear_error() {
    error_code = 0;
    memset(error_message, 0, ERROR_MESSAGE_MAX_SIZE);
}

bool has_error() {
    return error_code != 0;
}

void print_error() {
    if (error_code != 0) {
        fprintf(stderr, "Error(%d): %s \n", error_code, error_message);
    }
}

void finalize_error(void) {
    print_error();
    clear_error();
}

#define HARD_CALL(funcall) {                            \
    if (funcall != 0) {                                 \
        exit(1);                                        \
    }                                                   \

#define CALL(funcall)                                   \
    if (funcall != 0) {                                 \
        return 1;                                       \
    }
