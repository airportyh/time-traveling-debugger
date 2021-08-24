from .term_buffer import TermBuffer
from sstring import *

def test_init():
    buf = TermBuffer((5, 7))
    assert len(buf.lines) == 7
    for line in buf.lines:
        assert str(line) == "     "

def test_print():
    buf = TermBuffer((10, 10))
    buf.print_at(1, 2, "hello")
    assert buf.lines[0] == sstring(10 * " ")
    assert buf.lines[1] == sstring(10 * " ")
    assert buf.lines[2] == sstring(" hello    ")
    for line in buf.lines[3:]:
        assert line == sstring(10 * " ")

def test_print_too_far_right():
    buf = TermBuffer((10, 10))
    buf.print_at(1, 2, "hello, my dearest")
    assert buf.lines[2] == sstring(" hello, my")

def test_print_too_far_left():
    buf = TermBuffer((10, 10))
    buf.print_at(-2, 2, "hello")
    assert buf.lines[2] == sstring("llo       ")

def test_too_far_both_ways():
    buf = TermBuffer((10, 10))
    buf.print_at(-2, 2, "hello, my dearest")
    assert buf.lines[2] == sstring("llo, my de")

def test_too_far_both_ways_styled():
    buf = TermBuffer((10, 10))
    buf.print_at(-2, 2, sstring("hello, my dearest", [RED]))
    assert repr(buf.lines[2]) == "<31m>llo, my de</31m>"

def test_styles():
    buf = TermBuffer((10, 10))
    buf.print_at(1, 2, sstring("hello", [RED]))
    assert repr(buf.lines[2]) == " <31m>hello</31m>    "

def test_overlapping_styles():
    buf = TermBuffer((10, 10))
    buf.print_at(1, 2, sstring("hello", [RED]))
    buf.print_at(4, 2, sstring("world", [CYAN]))
    result = repr(buf.lines[2])
    assert repr(buf.lines[2]) == " <31m>hel</31m><36m>world</36m> "

def test_clear_rect():
    buf = TermBuffer((10, 10))
    for i in range(10):
        buf.print_at(0, i, "helloworld")
    buf.clear_rect(2, 2, 6, 6)
    assert buf.lines[0] == sstring("helloworld")
    assert buf.lines[1] == sstring("helloworld")
    assert buf.lines[8] == sstring("helloworld")
    assert buf.lines[9] == sstring("helloworld")
    for line in buf.lines[2:8]:
        assert line == sstring("he      ld")

def test():
    test_init()
    test_print()
    test_print_too_far_right()
    test_print_too_far_left()
    test_too_far_both_ways()
    test_too_far_both_ways_styled()
    test_styles()
    test_overlapping_styles()
    test_clear_rect()

if __name__ == "__main__":
    test()