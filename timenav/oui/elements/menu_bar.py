from oui import add_child
from .menu_button import MenuButton
from .vbox import VBox
from .hbox import HBox

class MenuBar:
    def __init__(self):
        self.box = HBox()
        add_child(self, self.box)
    
    def add_menu(self, label, menu):
        def on_open():
            # close other open popup menus
            for button in self.box.children:
                if button != menu_button and button.is_open:
                    button.close()
        menu_button = MenuButton(label, menu, on_open)
        add_child(self.box, menu_button)
    
    def layout(self, constraints):
        self.box.layout(constraints)
        self.size = self.box.size
    
    def paint(self, pos):
        self.pos = pos
        self.box.paint(pos)
    
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
