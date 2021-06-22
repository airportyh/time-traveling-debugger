from oui import *

def main():
    def global_key_handler(evt):
        if evt.key == "F2":
            # focus activate first menu
            menu_bar.activate_next_menu()
    
    ui = VBox()
    
    menu_bar = MenuBar()
    
    def on_exit():
        raise Exception("Exit")
    
    file_menu = PopUpMenu()
    file_menu.add_item(MenuItem(Text("New File")))
    file_menu.add_item(MenuItem(Text("Open...")))
    file_menu.add_item(MenuItem(Text("Save")))
    file_menu.add_item(MenuItem(Text("Save...")))
    file_menu.add_item(MenuItem(Text("Exit"), on_select=on_exit))
    
    menu_bar.add_menu(Text(" File "), file_menu)
    
    edit_menu = PopUpMenu()
    edit_menu.add_item(MenuItem(Text("Undo")))
    edit_menu.add_item(MenuItem(Text("Redo")))
    
    menu_bar.add_menu(Text(" Edit "), edit_menu)
    
    add_child(ui, menu_bar)
    
    content = VBox()
    for i in range(40):
        add_child(content, Text("How are you?"))
    add_child(ui, content)
    
    run(ui, global_key_handler)
    
if __name__ == "__main__":
    main()