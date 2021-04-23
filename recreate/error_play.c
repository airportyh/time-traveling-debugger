#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <errno.h>
#include <string.h>
#include <stdarg.h>

int error_code = 0;
#define ERROR_MESSAGE_MAX_SIZE 100
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
        printf("Error(%d): %s \n", error_code, error_message);
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
    }                                                   \

int divide(int x, int y, int *z) {
    if (y == 0) {
        set_error(1, "Division by zero error %d / %d", x, y);
        return 1;
    }
    (*z) = x / y;
    return 0;
}

int formula(int x, int y, int z, int *answer) {
    int step1;
    int step2;
    CALL(divide(x, y + z, &step1));
    CALL(divide(x + y, z, &step2));
    CALL(divide(step1, step2, answer));
    return 0;
}

int main() {
    atexit(finalize_error);

    int answer;
    CALL(divide(4, 2, &answer));
    printf("The answer is %d.\n", answer);
    // CALL(divide(4, 0, &answer));
    // printf("The answer is %d.\n", answer);

    CALL(formula(10, 4, -4, &answer));
    printf("formula answer is %d.\n", answer);
}