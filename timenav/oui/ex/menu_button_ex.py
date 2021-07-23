from oui import *
from oui.elements import *

def main():
    ui = Board()
    box = VBox()
    add_child(ui, box, stretch="both")
    
    selected_label = Text("                     ")
    add_child(box, Border(selected_label, "36"))
    
    def on_selected(evt):
        selected_label.set_text(evt.value.label)
    
    menu = Menu()
    menu.add_item(MenuItem("Eat yogurt", on_selected))
    menu.add_item(MenuItem("Drink water", on_selected))
    menu.add_item(MenuItem("Buy socks", on_selected))
    
    menu_button = MenuButton(Text("Choose"), menu, ui)
    
    add_child(box, menu_button)
    
    run(ui)
    
if __name__ == "__main__":
    main()