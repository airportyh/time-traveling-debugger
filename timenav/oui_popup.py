from oui import *

def main():
    ui = VerticalPanel()
    
    field = TextField(placeholder="What to do?", width=20)
    add_child(ui, Border(field, "36"))
    
    opened = False
    list_ui = VerticalPanel()
    add_child(list_ui, Text("Drink water"))
    add_child(list_ui, Text("Eat yogurt"))
    add_child(list_ui, Text("Buy socks"))
    popup = PopUp(Border(list_ui, color="33"), 1, 1)
    
    def on_open_clicked(evt):
        nonlocal opened
        
        opened = not opened
        if opened:
            popup.x = open.x
            popup.y = open.y + 1
            add_child(ui, popup)
            open.set_text("▼ Close")
        else:
            remove_child(ui, popup)
            open.set_text("▶ Open ")
        
    open = Text("▶ Open ")
    open.click = on_open_clicked
    add_child(ui, open)
    
    run(ui)
    
if __name__ == "__main__":
    main()