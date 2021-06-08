#include <stdio.h>
#include <sqlite3.h>
#include <stdlib.h>
#include <string.h>

int main() {

    char * str = malloc(sizeof(char) * 10);

    memset(str, '\0', sizeof(char) * 10);

    printf("%d\n", str[4]);
    free(str);
    
    return 0;
    
}