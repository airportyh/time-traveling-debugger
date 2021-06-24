from oui import add_child
from .vbox import VBox
from .border import Border
from .popup import PopUp
from .menu_item import MenuItem

class PopUpMenu:
    def __init__(self):
        self.box = VBox(same_item_width=True)
        self.highlighted = 0
        self.popup = PopUp(Border(self.box, color="36"), 1, 1)
        add_child(self, self.popup)
        self.x = 1
        self.y = 1
    
    def layout(self, constraints):
        self.popup.layout(constraints)
        self.size = self.popup.size
    
    def paint(self, pos):
        self.popup.x = self.x
        self.popup.y = self.y
        self.pos = (self.x, self.y)
        self.popup.paint(pos)
        self.size = self.popup.size
    
    def close(self):
        self.menu_button.close()
    
    def add_item(self, menu_item):
        add_child(self.box, menu_item)
        if self.highlighted == len(self.box.children) - 1:
            menu_item.set_highlighted(True)
            
    def get_menu_bar(self):
        return self.menu_button.get_menu_bar()
    
    def keypress(self, evt):
        # we need focus...
        if evt.key == "DOWN_ARROW":
            self.set_highlighted(self.highlighted + 1)
            if self.highlighted >= len(self.box.children):
                self.set_highlighted(0)
        elif evt.key == "UP_ARROW":
            self.set_highlighted(self.highlighted - 1)
            if self.highlighted < 0:
                self.set_highlighted(len(self.box.children) - 1)
            repaint(self)
        elif evt.key in ["RIGHT_ARROW", "\t"]:
            self.get_menu_bar().activate_next_menu()
        elif evt.key in ["LEFT_ARROW", "REVERSE_TAB"]:
            self.get_menu_bar().activate_prev_menu()
        elif evt.key in ["ESC"]:
            self.close()
        elif evt.key == "\r":
            item = self.box.children[self.highlighted]
            item.select()
        elif len(evt.key) == 1 and evt.key.isalpha():
            self.highlight_next_starting_with(evt.key)
    
    def highlight_next_starting_with(self, char):
        for i in range(self.highlighted + 1, len(self.box.children)):
            item = self.box.children[i]
            if item.label.text.lower().startswith(char.lower()):
                self.set_highlighted(i)
                return
        for i in range(self.highlighted):
            item = self.box.children[i]
            if item.label.text.lower().startswith(char.lower()):
                self.set_highlighted(i)
    
    def set_highlighted(self, value):
        if isinstance(value, MenuItem):
            value = self.box.children.index(value)
        self.box.children[self.highlighted].set_highlighted(False)
        self.highlighted = value
        self.box.children[self.highlighted].set_highlighted(True)
        
    def want_focus(self):
        return True
