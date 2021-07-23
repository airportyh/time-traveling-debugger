import sys
import os.path
parent_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
sys.path.append(parent_dir)

from termdb.gui import NavigatorGUI

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide a history file.")
    else:
        nav = NavigatorGUI(sys.argv[1])
        try:
            nav.run()
        except Exception as e:
            nav.clean_up()
            raise e