SQLITE_LDFLAGS=-L /usr/local/opt/sqlite/lib/

recreate.bin: recreate.c sqlite_helpers.h errors.h errors.c schema.sql parse.h
	gcc -no-pie -g -O0 -Wno-everything -Wreturn-type recreate.c errors.c -o recreate.bin $(SQLITE_LDFLAGS) -l sqlite3

clean:
	rm recreate.bin