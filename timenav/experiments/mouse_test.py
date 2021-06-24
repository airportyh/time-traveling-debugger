import tty
import termios
from term_util import *
import sys

def clean_up():
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_settings)
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
    while True:
        # data = sys.stdin.read(1)
        data = get_input()
        log("data: %r" % data)
        if data == "q":
            break

except Exception as e:
    clean_up()
    raise e

clean_up()