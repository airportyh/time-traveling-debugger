import sys
import fcntl
import os

DOWN_ARROW = [27, 91, 66]
UP_ARROW = [27, 91, 65]
RIGHT_ARROW = [27, 91, 67]
LEFT_ARROW = [27, 91, 68]

def write(value):
    print(value, end = '')
    sys.stdout.flush()

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')
    
def goto(x, y):
    write('\x1B[%d;%df' % (y, x))
    
def print_at(x, y, text):
    goto(x, y)
    print(text, end = '')
    sys.stdout.flush()

def get_input():
    fl_state = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    data = sys.stdin.read(1)
    if data == '\x1b':
        # temporarily set stdin to non-blocking mode so I can fetch
        # each character that's immediately available
        fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state | os.O_NONBLOCK)
        codes = ""
        while True:
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