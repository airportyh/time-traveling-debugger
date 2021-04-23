#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "uthash.h"

typedef struct _Person {
    unsigned long id;
    char *name;
    char *email;
    UT_hash_handle hh;
} Person;

Person *persons = NULL;
Person *personsById = NULL;

int main() {
    char *sentence = "I love Bobby Brown.";
    Person *p = malloc(sizeof(Person));
    memset(p, 0, sizeof(Person));
    p->id = 1;
    p->name = "Bobby";
    p->email = "bob@gmail.com";

    // HASH_ADD_KEYPTR(hh, persons, p->name, strlen(p->name), p);

    HASH_ADD_INT(personsById, id, p);

    Person *p2 = malloc(sizeof(Person));
    memset(p2, 0, sizeof(Person));
    p2->id = 2;
    p2->name = "Sarah";
    p2->email = "sarah@aol.com";

    // HASH_ADD_KEYPTR(hh, persons, p2->name, strlen(p2->name), p2);
    HASH_ADD_INT(personsById, id, p2);

    // Person *p3;
    // HASH_FIND_STR(persons, "Sarah", p3);
    // printf("Found person: %s\n", p3->name);
    // printf("      email: %s\n", p3->email);

    // Person *p4;
    // HASH_FIND(hh, persons, sentence + 7, 5, p4);
    // printf("Found person: %s\n", p4->name);
    // printf("      email: %s\n", p4->email);

    Person *p5;
    unsigned long id = 1;
    HASH_FIND_INT(personsById, &id, p5);
    printf("Found person by id: %s\n", p5->name);


}