from oui import *
from oui.elements import *

def main():
    def click1(evt):
        label.set_text("Nice! You clicked!")

    def click2(evt):
        label.set_text("You still clicked! MUAHAHAH!")

    panel = VBox()
    label = Text("What would you like to do?")
    click_button = Text("Click here!")
    add_handler(click_button, "click", click1)
    add_child(panel, click_button)
    dont_click_button = Text("Don't click")
    add_handler(dont_click_button, "click", click2)
    add_child(panel, dont_click_button)
    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()