from sstring import sstring
import random

def test_basic():
    a_string = sstring("Hello", "31m")
    print("basic", a_string)
    assert repr(a_string) == "<31m>Hello</31m>"

def test_concat():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = a_string + b_string
    print("concat", c_string)
    assert len(c_string) == 11

def test_indexing():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = sstring(" Test", "32m")
    d_string = a_string + b_string + c_string
    assert repr(a_string[1]) == '<31m>e</31m>'
    assert repr(d_string[8]) == '<33m>r</33m>'
    assert repr(d_string[12]) == '<32m>T</32m>'
    assert repr(d_string[15]) == '<32m>t</32m>'
    assert repr(d_string) == '<31m>Hello</31m><33m> World</33m><32m> Test</32m>'
    assert len(d_string) == 16

def test_ljust_rjust_center():
    a_string = sstring("Hello", "31m")
    b_string = sstring(" World", "33m")
    c_string = a_string + b_string
    ljustted = c_string.ljust(20)
    rjustted = c_string.rjust(20)
    cjustted = c_string.center(20)
    print("ljustted", ljustted)
    print("rjustted", rjustted)
    print("cjustted", cjustted)
    print(repr(ljustted))

def test_custom_color():
    custom_color = sstring('random', "38;5;$%dm" % 120)
    assert repr(custom_color) == '<38;5;$120m>random</38;5;$120m>'

def test_slice():
    a_string = sstring("Hello World", "31m")
    sliced = a_string[0: 5]
    assert repr(a_string[0: 5]) == "<31m>Hello</31m>"
    assert repr(a_string[0: 4]) == "<31m>Hell</31m>"

def test_concat_then_slice():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = a_string + b_string
    sliced = c_string[0: 6]
    assert repr(sliced) == "<31m>Hello</31m><33m>W</33m>"
    assert repr(c_string[1:]) == "<31m>ello</31m><33m>World</33m>"

def test_concat_then_slice_2():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = sstring("Test", "32m")
    d_string = a_string + b_string + c_string
    sliced = d_string[1: 12]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>ello</31m><33m>World</33m><32m>Te</32m>"

def test_concat_then_slice_3():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = sstring("Test", "32m")
    d_string = a_string + b_string + c_string
    sliced = d_string[2: 10]
    print(sliced)
    print(repr(sliced))
    assert repr(sliced) == "<31m>llo</31m><33m>World</33m>"
    
def test_wrapping():
    a_string = sstring("Hello", "31m")
    b_string = sstring("World", "33m")
    c_string = sstring(a_string + b_string, "34m")
    print("wrapping", repr(c_string))
    print("wrapping", c_string)

def test():
    test_basic()
    test_concat()
    test_ljust_rjust_center()
    test_indexing()
    test_custom_color()
    test_slice()
    test_concat_then_slice()
    test_concat_then_slice_2()
    test_concat_then_slice_3()
    test_wrapping()

if __name__ == "__main__":
    test()