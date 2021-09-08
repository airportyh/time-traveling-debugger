from oui import *
from oui.elements import *

def main():
    def click1(evt):
        label.set_text("Nice! You clicked!")

    def click2(evt):
        label.set_text("You still clicked! MUAHAHAH!")
    
    def on_keypress(evt):
        if evt.key == "q":
            quit()

    vbox = VBox()
    add_listener(vbox, "keypress", on_keypress)
    label = Text("What would you like to do?")
    add_child(vbox, label)
    click_button = Text("Click here!")
    add_listener(click_button, "click", click1)
    add_child(vbox, click_button)
    dont_click_button = Text("Don't click")
    add_listener(dont_click_button, "click", click2)
    add_child(vbox, dont_click_button)
    quit_label = Text("Press 'q' to quit")
    add_child(vbox, quit_label)

    run(vbox)

if __name__ == "__main__":
    main()