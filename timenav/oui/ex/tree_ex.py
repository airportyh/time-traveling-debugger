from oui import *
from oui.elements import *

def main():
    def click1(evt):
        label.set_text("Nice! You clicked!")

    def click2(evt):
        label.set_text("You still clicked! MUAHAHAH!")

    panel = VBox()
    tree_root = Tree(Text("poem"))
    b = Tree(Text("roses are red"))
    c = Tree(Text("violets are blue"))
    d = Tree(Text("sunflowers are yellow"))
    e = Tree(Text("grass are green"))
    f = Tree(Text("dung is brown"))
    add_child(d, e)
    add_child(d, f)
    add_child(tree_root, b)
    add_child(tree_root, c)
    add_child(tree_root, d)

    # scroll_view = ScrollView(tree_root)
    # add_child(panel, Border(scroll_view))
    add_child(panel, Border(tree_root))

    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()