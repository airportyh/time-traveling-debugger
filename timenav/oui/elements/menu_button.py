from oui import add_child, get_root, focus, remove_child, fire_event, add_listener
from oui import repaint
from events import Event
from sstring import BG_BRIGHT_CYAN

class MenuButton:
    def __init__(self, label, menu, container):
        self.label = label
        add_child(self, self.label)
        menu.menu_button = self
        self.menu = menu
        self.container = container
        self.is_open = False
        add_listener(self.menu, "close", self.on_menu_close)
    
    def layout(self, constraints):
        self.label.layout(constraints)
        self.size = self.label.size
    
    def paint(self):
        self.label.region = self.region
        self.label.paint()
    
    def on_menu_close(self, evt):
        self.is_open = False
        self.label.set_styles(None)
        repaint(self.label)
        fire_event(self, Event("close", menu_button=self, menu=self.menu))
    
    def open(self):
        x, y = self.region.offset
        pos = (x, y)
        add_child(self.container, self.menu, abs_pos=pos)
        focus(self.menu)
        self.is_open = True
        self.label.set_styles([BG_BRIGHT_CYAN])
        repaint(self.label)
        fire_event(self, Event("open", menu_button=self, menu=self.menu))
        
    def close(self):
        self.menu.close()
        
    def on_click(self, evt):
        if not self.is_open:
            self.open()
        else:
            self.close()