class MyObject:
    def __init__(self, a, b):
        self.a = a
        self.b = b

def main():
    d = {}
    d["a"] = 1
    d["b"] = 2
    o = MyObject(3, d)
    print(o.a)
    numbers = [1, 2, 3]
    for n in numbers:
        print(n)
    numbers2 = (4, 5, 6)
    for n in numbers2:
        print(n)

main()