from oui import *
from oui.elements import *

def main():
    ui = Board()
    
    box = VBox()
    add_child(ui, box)
    
    def on_open_clicked(evt):
        nonlocal opened
        opened = not opened
        if opened:
            x, y = open.region.offset
            y += 1
            add_child(ui, popup, abs_pos=(x, y))
            open.set_text("▼ Close")
        else:
            remove_child(ui, popup)
            open.set_text("▶ Open ")
        
    open = Text("▶ Open ")
    # add_listener(open, "click", on_open_clicked)
    open.click = on_open_clicked
    add_child(box, open)
    
    field = TextField(placeholder="What to do?", width=20)
    add_child(box, Border(field, "36"))
    
    opened = False
    list_ui = VBox()
    add_child(list_ui, Text("Drink water"))
    add_child(list_ui, Text("Eat yogurt"))
    add_child(list_ui, Text("Buy socks"))
    popup = Border(list_ui, color="33")
    add_child(box, list_ui)
    
    
    run(ui)
    
if __name__ == "__main__":
    main()