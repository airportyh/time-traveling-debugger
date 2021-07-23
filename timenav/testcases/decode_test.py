import sys
import os.path
parent_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
sys.path.append(parent_dir)

from term_util import *
import termios
import tty

def restore(settings):
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, settings)
    write('\x1B[0m')
    print("\n")

def run():
    sys.stdin.reconfigure(encoding='latin1')
    
    def clean_up():
        restore(original_settings)
        mouse_off()
        # cursor_on()

    original_settings = termios.tcgetattr(sys.stdin)

    try:    
        tty.setraw(sys.stdin)
        clear_screen()
        mouse_on()
        # cursor_off()
        quit = False
        while not quit:
            inp = get_input()
            if inp == "q":
                quit = True

    except Exception as e:
        clean_up()
        raise e
    
    clean_up()

run()