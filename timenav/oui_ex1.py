from oui import *

def main():
    def click1(evt):
        label.text = "Nice! You clicked!"

    def click2(evt):
        label.text = "You still clicked! MUAHAHAH!"
    
    def remove_f(evt):
        remove_child(d, f)

    panel = VerticalPanel()
    label = Text("What would you like to do?")
    button_panel = HorizontalPanel()
    click_button = Button(Text("Click here!"), mouseup=click1)
    dont_click_button = Button(Text("Don't click"), mouseup=remove_f)
    add_child(button_panel, click_button)
    add_child(button_panel, dont_click_button)
    # for i in range(10):
    #     add_child(button_panel, Button(Text("Button %d" % i)))
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

    # tree_panel = VerticalPanel()
    # add_child(tree_panel, tree_root)

    # add_child(panel, tree_panel, stretch="both")
    add_child(panel, tree_root)

    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()