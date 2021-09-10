from sstring import *
from oui import *
from oui.elements import *

def main():
    def on_keypress(evt):
        if evt.key == "q":
            quit()
        
    ui = VBox()
    
    hbox = HBox()
    field = TextField(placeholder="What to do?", width=20)
    button = Text(sstring("Add", [REVERSED]))
    add_listener(field, "keypress", on_keypress)
    add_child(hbox, field, stretch="x")
    add_child(hbox, button)
    add_child(ui, Border(hbox), stretch="x")
    
    list_ui = VBox()
    add_child(ui, Border(list_ui), stretch="x")
    add_child(list_ui, Text("Water plants"))
    add_child(list_ui, Text("Do homework"))
    add_child(list_ui, Text("Make dinner"))
    
    run(ui)
    
if __name__ == "__main__":
    main()
    