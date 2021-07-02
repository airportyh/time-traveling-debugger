import sys
import os.path
parent_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
sys.path.append(parent_dir)

from oui import *
from oui.elements import *

def main():
    def click1(evt):
        label.set_text("Nice! You clicked!")

    def click2(evt):
        label.set_text("You still clicked! MUAHAHAH!")

    panel = VBox()
    label = Text("What would you like to do?")
    button_panel = HBox()
    click_button = Text("Click here!")
    add_handler(click_button, "click", click1)
    dont_click_button = Text("Don't click")
    add_handler(dont_click_button, "click", click2)
    add_child(button_panel, click_button)
    add_child(button_panel, dont_click_button)
    add_child(panel, label)
    add_child(panel, button_panel)
    
    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()