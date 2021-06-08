#include <stdio.h>
#include <sqlite3.h>

sqlite3* db;
int main(int argc, char *argv[]) {
    char *sql = 
    "create table Person ("
        "id integer primary key,"
        "first_name text,"
        "last_name text"
    ");";
    char *err;
    remove("test2.sqlite");

    if (SQLITE_OK != sqlite3_open("test2.sqlite", &db)) {
        printf("Error opening db: %s\n", sqlite3_errmsg(db));
        return 1;
    }

    printf("Opened db successfully!\n");

    if (SQLITE_OK != sqlite3_exec(db, sql, NULL, 0, &err)) {
        printf("Error executing SQL statement %s.\n", err);
        sqlite3_free(err);
        return 1;
    }

    printf("Table created successfully!\n");

    
    sqlite3_close(db);
    printf("Database closed.\n");
    return 0;
}