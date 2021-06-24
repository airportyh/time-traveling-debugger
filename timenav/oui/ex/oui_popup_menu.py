from oui import *

def main():
    ui = VerticalPanel()
    
    selected_label = Text("                     ")
    add_child(ui, Border(selected_label, "36"))
    
    def on_option_selected(option):
        nonlocal opened
        remove_child(ui, menu)
        open.set_text("▶ Open ")
        opened = False
        selected_label.set_text(option)
    
    opened = False
    
    options = [
        "Drink water",
        "Eat yogurt",
        "Buy socks"
    ]
    menu = PopUpMenu(options, 1, 1, on_option_selected)
    
    def on_open_clicked(evt):
        nonlocal opened
        
        opened = not opened
        if opened:
            menu.x = open.x
            menu.y = open.y + 1
            add_child(ui, menu)
            open.set_text("▼ Close")
            focus(menu)
        else:
            remove_child(ui, menu)
            open.set_text("▶ Open ")
        
    open = Text("▶ Open ")
    open.click = on_open_clicked
    add_child(ui, open)
    
    run(ui)
    
if __name__ == "__main__":
    main()