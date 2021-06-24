from term_util import *
import os
import tty
import termios
import sys

def clean_up():
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_settings)
    mouse_off()
    mouse_motion_off()
    print('\x1B[0m')
    print("\n")

original_settings = termios.tcgetattr(sys.stdin)
logfile = open("ui.log", "a")

def log(text):
    logfile.write(text + "\n")
    logfile.flush()

try:
    tty.setraw(sys.stdin)
    clear_screen()
    mouse_on()
    mouse_motion_on()
    termsize = os.get_terminal_size()
    width = termsize.columns
    height = termsize.lines
    print_at(1, 1, "┏" + ("━" * (width - 2)) + "┓")
    for i in range(height - 2):
        print_at(1, 1 + i + 1, "┃")
        print_at(1 + width - 1, 1 + i + 1, "┃")
    print_at(1, 1 + height - 1, "┗" + ("━" * (width - 2)) + "┛")
    
    while True:
        # data = sys.stdin.read(1)
        data = get_input()
        termsize = os.get_terminal_size()
        
        if data == "q":
            break

except Exception as e:
    clean_up()
    raise e

clean_up()


