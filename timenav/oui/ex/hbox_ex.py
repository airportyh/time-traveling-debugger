from oui import *
from oui.elements import *

def main():
    ui = HBox()
    
    add_child(ui, Border(Text("Hello, world"), "36;1"))
    add_child(ui, Border(Text("You are my man!"), "33;1"), stretch="x")
    add_child(ui, Border(Text("I love you"), "36;1"), stretch="both")
    
    run(ui)
    
main()