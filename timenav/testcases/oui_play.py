import sys
import os.path
parent_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
sys.path.append(parent_dir)

from oui import *
from oui.elements import *

def main():
    def global_key_handler(evt):
        if evt.key == "F2":
            # focus activate first menu
            menu_bar.activate_next_menu()
    
    
    ui = Board()
    app_body = VBox()
    add_child(ui, app_body)
    
    menu_bar = MenuBar(ui)
    
    def on_exit(evt):
        raise Exception("Exit")
    
    file_menu = Menu()
    file_menu.add_item(MenuItem("New File"))
    file_menu.add_item(MenuItem("Open..."))
    file_menu.add_item(MenuItem("Save"))
    file_menu.add_item(MenuItem("Save..."))
    file_menu.add_item(MenuItem("Exit", on_select=on_exit))
    
    menu_bar.add_menu(Text(" File "), file_menu)
    
    edit_menu = Menu()
    edit_menu.add_item(MenuItem("Undo"))
    edit_menu.add_item(MenuItem("Redo"))
    
    menu_bar.add_menu(Text(" Edit "), edit_menu)
    
    add_child(app_body, menu_bar)
    
    content = VBox()
    for i in range(40):
        add_child(content, Text("How are you?"))
    add_child(app_body, content)
    
    run(ui, global_key_handler)
    
if __name__ == "__main__":
    main()