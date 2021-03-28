def g(arg):
    print("called me g")

def f():
    sum = 0
    for i in range(10):
        sum += i
    g("hey")
    return sum

print(f())