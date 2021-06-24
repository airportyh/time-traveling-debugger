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
    
    tree_root = Tree(Text("a"))
    b = Tree(Text("b"))
    c = Tree(Text("c"))
    d = Tree(Text("d"))
    e = Tree(Text("e"))
    f = Tree(Text("f"))
    add_child(d, e)
    add_child(d, f)
    add_child(tree_root, b)
    add_child(tree_root, c)
    add_child(tree_root, d)

    # tree_panel = VBox()
    # add_child(tree_panel, tree_root)

    # add_child(panel, tree_panel, stretch="both")
    add_child(panel, tree_root)

    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()