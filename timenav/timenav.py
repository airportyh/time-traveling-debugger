import termios
import sys
import tty
import fcntl
import os
from urllib import request
import json
import traceback
from functools import reduce

class HistoryAPI(object):
    def __init__(self):
        self.session_cookie = None
    
    def fetch_fun_call(self, id):
        req = request.Request("http://localhost:1338/api/FunCallExpanded?id=%d" % id)
        if self.session_cookie:
            req.add_header("Cookie", self.session_cookie)
        response = request.urlopen(req)
        result = json.loads(response.read())
        set_cookie = response.getheader("Set-Cookie")
        if set_cookie:
            self.session_cookie = response.getheader("Set-Cookie").split(";")[0]
        return result
    
    def fetch_code_file(self, id):
        response = request.urlopen("http://localhost:1338/api/CodeFile?id=%d" % id)
        return json.loads(response.read())

class Position(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y

def write(value):
    print('\x1B' + value, end = '')
    sys.stdout.flush()

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')
    
def goto(x, y):
    write('[%d;%df' % (y, x))
    
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

def reset_term(original_settings):
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_settings)
    print('\x1B[0m')

def main():
    original_settings = termios.tcgetattr(sys.stdin)
    api = HistoryAPI()
    try:
        tty.setraw(sys.stdin)
        clear_screen()
        
        fun_call = api.fetch_fun_call(1)
        
        code_file = api.fetch_code_file(fun_call['code_file_id'])
        code_lines = code_file['source'].split('\n')
        snapshots = fun_call['snapshots']
        largest_line_no = reduce(
            lambda l, snapshot: max(l, snapshot['line_no']), snapshots, 0)
        gutter_width = len(str(largest_line_no))
        line_idx = 1
        for i, snapshot in enumerate(snapshots):
            next_snapshot = None
            if i + 1 < len(snapshots):
                next_snapshot = snapshots[i + 1]
            line_no = snapshot['line_no']
            if next_snapshot and line_no == next_snapshot['line_no']:
                # skipping because next execution is on same line
                continue
            line = code_lines[line_no - 1]
            line_no_display = '\u001b[36m' + str(line_no).rjust(gutter_width) + '\u001b[0m'
            print_at(1, line_idx, line_no_display + '  ' + line)
            line_idx += 1
        
        while True:
            answer = get_input()
            if answer == "q":
                break
            print(answer, end = '')
            sys.stdout.flush()
    except Exception as e:
        reset_term(original_settings)
        raise e

    reset_term(original_settings)
    
if __name__ == "__main__":
    main()