import sys
import fcntl
import os

termsize = os.get_terminal_size()

DOWN_ARROW = [27, 91, 66]
UP_ARROW = [27, 91, 65]
RIGHT_ARROW = [27, 91, 67]
LEFT_ARROW = [27, 91, 68]

def write(value):
    print(value, end = '')
    sys.stdout.flush()

def style(text, code):
    return "\x1B[%sm%s\x1B[0m" % (code, text)

def strike_through(s):
    result = ""
    for char in s:
        result += char + "\u0336"
    return result

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')

def reset():
    write('\x1B[0m')
    
def goto(x, y):
    write('\x1B[%d;%df' % (y, x))
    
def print_at(x, y, text):
    goto(x, y)
    print(text, end = '')
    sys.stdout.flush()

def clear_rect(x, y, width, height):
    for i in range(height):
        print_at(x, y + i, " " * width)

def get_input():
    fl_state = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    # in blocking mode, 
    # this blocks until next input byte, which can be keyboard or mouse data
    data = sys.stdin.read(1)
    if data == '\x1b':  # this control code marks start of a control
                        # sequence with more bytes to follow
        # temporarily set stdin to non-blocking mode so I can read
        # all the characters that's immediately available
        fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state | os.O_NONBLOCK)
        codes = ""
        while True:
            # in non-blocking mode, this returns '' when no more bytes are available
            ch = sys.stdin.read(1)
            if ch == '':
                # reset stdin back to blocking mode
                fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state)
                break
            else:
                codes += ch
        data += codes
    return data

def mouse_motion_on():
    write('\x1B[?1003h')
    
def mouse_motion_off():
    write('\x1B[?1003l')

def mouse_on():
    write('\x1B[?1000h')

def mouse_off():
    write('\x1B[?1000l')

def cursor_on():
    write('\x1B[?25h')

def cursor_off():
    write('\x1B[?25l')