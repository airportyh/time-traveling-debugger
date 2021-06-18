from oui import *

def main():
    root = VerticalPanel()
    label = Label("What to do?")
    add_child(root, label)
    field = TextField("Magic")
    add_child(root, field)
    focus(field)
    
    run(root)
    
if __name__ == "__main__":
    main()