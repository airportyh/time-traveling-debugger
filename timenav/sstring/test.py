from sstring import *

def test_basic():
    a_string = sstring("Hello", RED)
    print("basic", a_string)
    assert repr(a_string) == "<31m>Hello</31m>"
    assert str(a_string) == '\x1b[31mHello\x1b[0m'

def test_multiple_control_codes():
    a_string = sstring("Hello", [RED, UNDERLINE])
    print(a_string)
    assert repr(a_string) == "<31m,4m>Hello</31m,4m>"
    assert str(a_string) == '\x1b[31m\x1b[4mHello\x1b[0m'
    
def test_len():
    a_string = sstring("Hello", GREEN)
    assert len(a_string) == 5

def test_concat():
    a_string = sstring("Hello", RED)
    b_string = sstring(" World", YELLOW)
    c_string = a_string + b_string
    assert len(c_string) == len(a_string) + len(b_string)
    assert len(c_string) == 11
    assert repr(c_string) == "<31m>Hello</31m><33m> World</33m>"
    assert str(c_string) == '\x1b[31mHello\x1b[0m\x1b[33m World\x1b[0m'
    d_string = c_string + sstring(" and you", "34m")
    assert repr(d_string) == "<31m>Hello</31m><33m> World</33m><34m> and you</34m>"
    assert len(d_string) == 19

def test_index():
    a_string = sstring("Hello world", RED)
    char = a_string[1]
    print("index", char)
    assert len(char) == 1
    assert repr(char) == "<31m>e</31m>"

def test_slice():
    a_string = sstring("Hello world", RED)
    slice1 = a_string[1:4]
    assert repr(slice1) == "<31m>ell</31m>"
    assert len(slice1) == 3
    slice2 = a_string[6:]
    assert repr(slice2) == "<31m>world</31m>"
    assert len(slice2) == 5
    slice3 = a_string[:5]
    assert repr(slice3) == "<31m>Hello</31m>"
    assert len(slice3) == 5
    slice4 = a_string[0:]
    assert repr(slice4) == "<31m>Hello world</31m>"
    assert len(slice4) == 11

def test_complex_control_code():
    custom_color = sstring('a string', color256(134))
    print("custom_color", custom_color)
    assert repr(custom_color) == '<38;5;134m>a string</38;5;134m>'

def test_strike_through():
    a_string = sstring("Hello world", RED, strike_through=True)
    assert str(a_string) == '\x1b[31mH̶e̶l̶l̶o̶ ̶w̶o̶r̶l̶d̶\x1b[0m'
    print("strike through", a_string)
    assert repr(a_string) == '<31m->Hello world</31m->'

def test_ljust():
    a_string = sstring("Hello", RED)
    b_string = a_string.ljust(10)
    assert repr(b_string) == '<31m>Hello     </31m>'
    c_string = a_string.ljust(10, '-')
    assert repr(c_string) == '<31m>Hello-----</31m>'

def test_rjust():
    a_string = sstring("Hello", RED)
    b_string = a_string.rjust(10)
    assert repr(b_string) == '<31m>     Hello</31m>'
    c_string = a_string.rjust(10, '-')
    assert repr(c_string) == '<31m>-----Hello</31m>'

def test_center():
    a_string = sstring("Hello", RED)
    b_string = a_string.center(10)
    assert repr(b_string) == '<31m>  Hello   </31m>'
    c_string = a_string.center(10, '-')
    assert repr(c_string) == '<31m>--Hello---</31m>'

def test_index_group():
    a_string = sstring("Hello", RED)
    b_string = sstring(" World", YELLOW)
    c_string = a_string + b_string
    assert repr(c_string[1]) == '<31m>e</31m>'
    assert repr(c_string[8]) == '<33m>r</33m>'

def test_slice_group():
    a_string = sstring("Hello", RED)
    b_string = sstring("World", YELLOW)
    c_string = a_string + b_string
    slice1 = c_string[0:3]
    assert repr(slice1) == "<31m>Hel</31m>"
    slice2 = c_string[0:5]
    assert repr(slice2) == "<31m>Hello</31m>"
    slice3 = c_string[3:7]
    assert repr(slice3) == "<31m>lo</31m><33m>Wo</33m>"
    slice4 = c_string[6:8]
    assert repr(slice4) == "<33m>or</33m>"
    slice5= c_string[8:]
    assert repr(slice5) == "<33m>ld</33m>"

def test_multiple_codes_group():
    a_string = sstring("Hello", RED)
    b_string = sstring("World", YELLOW)
    c_string = sstring(a_string + b_string, [UNDERLINE, REVERSED])
    print("multiple codes group", c_string)
    assert repr(c_string) == "<4m,7m><31m>Hello</31m><33m>World</33m></4m,7m>"
    assert str(c_string) == '\x1b[4m\x1b[7m\x1b[31mHello\x1b[0m\x1b[4m\x1b[7m\x1b[33mWorld\x1b[0m'

def test_strike_through_group():
    a_string = sstring("Hello", RED)
    b_string = sstring("World", YELLOW)
    c_string = sstring(a_string + b_string, [UNDERLINE], strike_through=True)
    print("strike through group", c_string)
    assert str(c_string) == '\x1b[4m\x1b[31mH̶e̶l̶l̶o̶\x1b[0m\x1b[4m\x1b[33mW̶o̶r̶l̶d̶\x1b[0m'
    assert repr(c_string) == '<4m-><31m>Hello</31m><33m>World</33m></4m->'

def test_ljust_rjust_center_group():
    a_string = sstring("Hello", BG_YELLOW)
    b_string = sstring(" World", BG_MAGENTA)
    c_string = a_string + b_string
    print("ljust", c_string.ljust(15))
    assert repr(c_string.ljust(15)) == "<43m>Hello</43m><45m> World</45m><45m>    </45m>"
    assert repr(c_string.ljust(15, '-')) == "<43m>Hello</43m><45m> World</45m><45m>----</45m>"
    print("ljust short", c_string.ljust(5))
    print("ljust short", repr(c_string.ljust(5)))
    assert repr(c_string.ljust(5)) == repr(c_string)
    print("rjust", c_string.rjust(15))
    assert repr(c_string.rjust(15)) == "<43m>    </43m><43m>Hello</43m><45m> World</45m>"
    
    print("center", c_string.center(15))
    assert repr(c_string.center(15)) == "<43m>  </43m><43m>Hello</43m><45m> World</45m><45m>  </45m>"

def test_nesting():
    a_string = sstring("Hello")
    b_string = sstring(" World", YELLOW)
    c_string = sstring(sstring("+") + a_string + b_string + sstring("+"), UNDERLINE)
    print("nested", c_string)
    assert str(c_string) == '\x1b[4m+Hello\x1b[0m\x1b[4m\x1b[33m World\x1b[0m\x1b[4m+\x1b[0m'
    assert len(c_string) == len(a_string) + len(b_string) + 2
    print("nested", repr(c_string))
    assert repr(c_string) == "<4m>+Hello<33m> World</33m>+</4m>"

def test_equality():
    assert sstring("Hello") == sstring("Hello")
    assert sstring("Hello", RED) == sstring("Hello", RED)
    a_string = sstring("Hello", BG_YELLOW)
    b_string = sstring(" World", BG_MAGENTA)
    c_string = a_string + b_string
    d_string = a_string + b_string
    assert c_string == d_string
    assert sstring(a_string) == a_string
    assert sstring(d_string) == d_string
    
def test():
    test_basic()
    test_multiple_control_codes()
    test_len()
    test_concat()
    test_index()
    test_slice()
    test_complex_control_code()
    test_strike_through()
    test_ljust()
    test_rjust()
    test_center()
    test_index_group()
    test_slice_group()
    test_multiple_codes_group()
    test_strike_through_group()
    test_ljust_rjust_center_group()
    test_nesting()
    test_equality()
    print(sstring("ok", [GREEN]))

if __name__ == "__main__":
    test()