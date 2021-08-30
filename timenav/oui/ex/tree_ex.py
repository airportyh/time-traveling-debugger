from oui import *
from oui.elements import *

def main():
    def click1(evt):
        label.set_text("Nice! You clicked!")

    def click2(evt):
        label.set_text("You still clicked! MUAHAHAH!")
    
    def on_expand(evt):
        path = []
        tree = evt.tree
        while tree and isinstance(tree, Tree):
            path.insert(0, tree.label_text)
            tree = tree.parent
        key = "/".join(path)
        label.set_text("expanded - %s" % key)
    
    def on_collapse(evt):
        path = []
        tree = evt.tree
        while tree and isinstance(tree, Tree):
            path.insert(0, tree.label_text)
            tree = tree.parent
        key = "/".join(path)
        label.set_text("collapsed - %s" % key)

    panel = VBox()
    tree_root = Tree("poem")
    b = Tree("roses are red")
    c = Tree("violets are blue")
    d = Tree("sunflowers are yellow")
    e = Tree("grass are green")
    f = Tree("dung is brown")
    add_child(d, e)
    add_child(d, f)
    add_child(tree_root, b)
    add_child(tree_root, c)
    add_child(tree_root, d)
    add_listener(tree_root, "expand", on_expand)
    add_listener(tree_root, "collapse", on_collapse)

    label = Text("")
    add_child(panel, label)
    add_child(panel, Border(tree_root))

    quit_label = Text("Press 'q' to quit")
    add_child(panel, quit_label)

    run(panel)

if __name__ == "__main__":
    main()