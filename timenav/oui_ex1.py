from oui import *

def main():
    def click1(evt):
        label.text = "Nice! You clicked!"

    def click2(evt):
        label.text = "You still clicked! MUAHAHAH!"

    panel = VerticalPanel()
    label = Label("What would you like to do?")
    button_panel = HorizontalPanel()
    click_button = Button(Label("Click here!"), mouseup=click1)
    dont_click_button = Button(Label("Don't click"), mouseup=click2)
    add_child(button_panel, click_button)
    add_child(button_panel, dont_click_button)
    # for i in range(10):
    #     add_child(button_panel, Button(Label("Button %d" % i)))
    add_child(panel, label)
    add_child(panel, button_panel)
    
    tree_root = Tree(Label("a"))
    b = Tree(Label("b"))
    c = Tree(Label("c"))
    d = Tree(Label("d"))
    e = Tree(Label("e"))
    f = Tree(Label("f"))
    add_child(d, e)
    add_child(d, f)
    add_child(tree_root, b)
    add_child(tree_root, c)
    add_child(tree_root, d)

    tree_panel = VerticalPanel()
    add_child(tree_panel, tree_root)

    add_child(panel, tree_panel, stretch="both")

    quit_label = Label("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()