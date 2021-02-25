import termios
import sys
import tty
import fcntl
import os
from urllib import request
import json
import traceback
from functools import reduce

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

def mouse_motion_on():
    write('\x1B[?1003h')
    
def mouse_motion_off():
    write('\x1B[?1003l')

def mouse_on():
    write('\x1B[?1000h')

def mouse_off():
    write('\x1B[?1000l')

class Event(object):
    def __init__(self, etype, **kwargs):
        self.type = etype
        self.__dict__.update(kwargs)
    
    def __repr__(self):
        parts = [self.type]
        for attr, value in self.__dict__.items():
            if attr != "type":
                parts.append("%s=%s" % (attr, value))
        return "Evt(%s)" % (" ".join(parts))

def decode_input(an_input):
    events = []
    codes = list(map(ord, an_input))
    while len(codes) > 0:
        if codes[0:3] == [27, 91, 77]:
            # mouse event
            if codes[3] == 32:
                event = Event("mousedown", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 35:
                x = codes[4] - 32
                y = codes[5] - 32
                event = Event("mouseup", x = x, y = y)
                events.append(event)
                if len(events) == 2 and events[0].type == "mousedown":
                    # generate a click event
                    events.append(Event("click", x = x, y = y))
                codes = codes[6:]
            elif codes[3] == 96:
                event = Event("wheeldown", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 97:
                event = Event("wheelup", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
        else:
            # don't understand
            break
    return events
    


class TermUIToy(object):
    
    def save_term_settings(self):
        self.original_settings = termios.tcgetattr(sys.stdin)
    
    def restore_term_settings(self):
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, self.original_settings)
        print('\x1B[0m')
        
    def clean_up(self):
        self.restore_term_settings()
        mouse_off()
        # mouse_motion_off()
    
    def run(self):
        self.save_term_settings()
        try:
            tty.setraw(sys.stdin)
            clear_screen()
            mouse_on()

            
            
            while True:
                answer = get_input()
                if answer == "q":
                    break
                if answer[0] == '\x1B':
                    events = decode_input(answer)
                    goto(1, 10)
                    print(events, end = '')
                sys.stdout.flush()
            
            self.clean_up()
        except Exception as e:
            self.clean_up()
            raise e
    
if __name__ == "__main__":
    TermUIToy().run()