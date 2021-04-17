from my_input import my_input

name = my_input("What is your name? ")
age = int(my_input("What is your age? " ))

year = 2021 - age
print("Hello %s! You were born in %d" % (name, year))