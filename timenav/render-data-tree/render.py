import sys
import fcntl
import os

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')

def write(value):
    print(value, end = '')
    sys.stdout.flush()
    
def goto(x, y):
    write('\x1B[%d;%df' % (y, x))

def get_input():
    fl_state = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    data = sys.stdin.read(1)
    #print("read char", data)
    if data == '\x1b':
        # temporarily set stdin to non-blocking mode so I can fetch
        # each character that's immediately available
        fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state | os.O_NONBLOCK)
        codes = ""
        while True:
            ch = sys.stdin.read(1)
            #print("read char", ch)
            if ch == '':
                # reset stdin back to blocking mode
                fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state)
                break
            else:
                codes += ch
        data += codes
    return data