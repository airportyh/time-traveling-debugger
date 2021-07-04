from oui import add_child, get_root, focus, remove_child

class MenuButton:
    def __init__(self, label, popup_menu, on_open=None, on_close=None):
        self.label = label
        add_child(self, self.label)
        popup_menu.menu_button = self
        self.popup_menu = popup_menu
        self.is_open = False
        self.on_open = on_open
        self.on_close = on_close
    
    def layout(self, constraints):
        self.label.layout(constraints)
        self.size = self.label.size
    
    def paint(self):
        self.label.region = self.region
        self.label.paint()
    
    def open(self):
        x, y = self.pos
        self.popup_menu.x = x
        self.popup_menu.y = y + 1
        add_child(get_root(), self.popup_menu)
        focus(self.popup_menu)
        self.is_open = True
        selected_background = "46;1"
        self.label.add_style(selected_background)
        if self.on_open:
            self.on_open()
        
    def close(self):
        remove_child(get_root(), self.popup_menu)
        self.is_open = False
        selected_background = "46;1"
        self.label.remove_style(selected_background)
        if self.on_close:
            self.on_close()
        
    def click(self, evt):
        if not self.is_open:
            self.open()
        else:
            self.close()
    
    def get_menu_bar(self):
        return self.parent.parent