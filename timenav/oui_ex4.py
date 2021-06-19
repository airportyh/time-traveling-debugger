from oui import *

def main():
    root = VerticalPanel()
    # label1 = Label(placeholder="What to do?")
    # add_child(root, label1)
    field1 = TextField("", width=20, placeholder="What to do?")
    add_child(root, field1)
    
    label2 = Label("How many times?")
    add_child(root, label2)
    field2 = TextField("", width=5)
    add_child(root, field2)
    
    label3 = Label("what's the day of the week?")
    add_child(root, label3)
    field3 = TextField("", width=10)
    add_child(root, field3)
    
    run(root)
    
if __name__ == "__main__":
    main()