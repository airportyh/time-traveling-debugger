from oui import *
from oui.elements import *

def main():
    ui = Board()
    box = VBox()
    add_child(ui, box, stretch="both")
    
    selected_label = Text("                     ")
    add_child(box, Border(selected_label, "36"))
    
    def on_option_selected(option):
        nonlocal opened
        remove_child(ui, menu)
        open.set_text("▶ Open ")
        opened = False
        selected_label.set_text(option)
    
    def on_menu_close(evt):
        nonlocal opened
        open.set_text("▶ Open ")
        opened = False
    
    def on_selected(evt):
        selected_label.set_text(evt.value.label)
    
    opened = False
    
    menu = Menu()
    add_listener(menu, "close", on_menu_close)
    menu.add_item(MenuItem("Eat yogurt", on_selected))
    menu.add_item(MenuItem("Drink water", on_selected))
    menu.add_item(MenuItem("Buy socks", on_selected))
    
    def on_open_clicked(evt):
        nonlocal opened
        
        opened = not opened
        if opened:
            x, y = open.region.offset
            add_child(ui, menu, abs_pos=(x, y + 1))
            open.set_text("▼ Close")
            focus(menu)
        else:
            remove_child(ui, menu)
            open.set_text("▶ Open ")
        
    open = Text("▶ Open ")
    add_listener(open, "click", on_open_clicked)
    add_child(box, open)
    
    run(ui)
    
if __name__ == "__main__":
    main()