from sstring import sstring
import random

def test_1():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    print(a_string)
    print(b_string)
    assert repr(a_string) == "<31m>Hello</31m>"
    print(repr(a_string))

def test_2():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = a_string + b_string
    print(c_string)
    print(repr(c_string))
    assert len(c_string) == 11

def test_3():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = a_string + b_string
    ljustted = c_string.ljust(20)
    rjustted = c_string.rjust(20)
    cjustted = c_string.center(20)
    print("result is: '" + ljustted + "'")
    print("result is: '" + rjustted + "'")
    print("result is: '" + cjustted + "'")

def test_4():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = sstring(" Test", "32m")
    d_string = a_string + b_string + c_string
    print(a_string[1])
    print(d_string[9])

def test_5():
    id = random.randint(0, 256)
    ran_string = sstring('random', "38;5;$%dm" % id)
    print(ran_string)
    print(repr(ran_string))

def test_6():
    a_string = sstring("Hello World", "31m")
    sliced = a_string[0: 5]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>Hello</31m>"

def test_7():
    a_string = sstring("Hello World", "31m")
    sliced = a_string[0: 4]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>Hell</31m>"

def test_8():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = a_string + b_string
    sliced = c_string[0: 6]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>Hello</31m><33m>W</33m>"

def test_9():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = sstring("Test", "32m")
    d_string = a_string + b_string + c_string
    sliced = d_string[1: 12]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>ello</31m><33m>World</33m><32m>Te</32m>"

def test_10():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = sstring("Test", "32m")
    d_string = a_string + b_string + c_string
    sliced = d_string[2: 10]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>llo</31m><33m>World</33m>"


def main():
    test_1()
    test_2()
    test_3()
    test_4()
    test_5()
    test_6()
    test_7()
    test_8()
    test_9()
    test_10()

if __name__ == "__main__":
    main()