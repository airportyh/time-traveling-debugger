from oui import add_child, add_listener
from .menu_button import MenuButton
from .vbox import VBox
from .hbox import HBox

class MenuBar:
    def __init__(self, menu_container):
        self.box = HBox()
        add_child(self, self.box)
        self.menu_container = menu_container
    
    def add_menu(self, label, menu):
        add_listener(menu, "next", self.on_menu_next)
        add_listener(menu, "previous", self.on_menu_previous)
        menu_button = MenuButton(label, menu, self.menu_container)
        add_listener(menu_button, "open", self.on_menu_button_open)
        add_child(self.box, menu_button)    
        
    def on_menu_button_open(self, evt):
        # close other open popup menus
        for button in self.box.children:
            if button != evt.menu_button and button.is_open:
                button.close()
    
    def layout(self, constraints):
        self.box.layout(constraints)
        self.size = self.box.size
    
    def paint(self):
        self.box.region = self.region
        self.box.paint()
    
    def on_menu_next(self, evt):
        self.activate_next_menu()
    
    def on_menu_previous(self, evt):
        self.activate_prev_menu()
    
    def activate_next_menu(self):
        if len(self.box.children) == 0:
            return
        idx = None
        for i, button in enumerate(self.box.children):
            if button.is_open:
                idx = i
                break
        if idx is None:
            idx = 0
        else:
            active = self.box.children[idx]
            active.close()
            idx += 1
        if idx >= len(self.box.children):
            idx = 0
        new_active = self.box.children[idx]
        new_active.open()

    def activate_prev_menu(self):
        idx = None
        for i, button in enumerate(self.box.children):
            if button.is_open:
                idx = i
                break
        if idx is None:
            return
        active = self.box.children[idx]
        active.close()
        idx -= 1
        if idx < 0:
            idx = len(self.box.children) - 1
        new_active = self.box.children[idx]
        new_active.open()
