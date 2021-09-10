table = { 1: 1, 2: 1 }

def fib(n):
    if n in table:
        return table[n]
    a = fib(n - 1)
    b = fib(n - 2)
    answer = a + b
    table[n] = answer
    return answer

# 1 1 2 3 5 8
print(fib(9))