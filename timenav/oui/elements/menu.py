from oui import add_child, repaint, add_listener, fire_event, remove_child, Event, remove_children, get_root
from .vbox import VBox
from .border import Border
from .scroll_view import ScrollView
from .menu_item import MenuItem
import time

class Menu:
    def __init__(self):
        self.vbox = VBox(same_item_width=True)
        self.scroll_view = ScrollView(self.vbox)
        self.highlighted = 0
        self.popup = Border(self.scroll_view, color="36")
        add_child(self, self.popup)
    
    def layout(self, constraints):
        self.popup.layout(constraints)
        self.size = self.popup.size
    
    def paint(self):
        self.popup.region = self.region
        width, height = self.size
        self.region.clear_rect(0, 0, width, height)
        self.popup.paint()
    
    def remove_items(self):
        remove_children(self.vbox)
    
    def add_item(self, menu_item):
        add_child(self.vbox, menu_item)
        add_listener(menu_item, "select", self.on_menu_item_select)
        if self.highlighted == len(self.vbox.children) - 1:
            menu_item.set_highlighted(True)
        
    def on_menu_item_select(self, evt):
        self.set_highlighted(evt.value)
        self.close()
        
    def close(self):
        if self.parent is None:
            return
        remove_child(self.parent, self)
        fire_event(self, Event("close", element=self))
            
    def get_menu_bar(self):
        return self.menu_button.get_menu_bar()
    
    def on_keypress(self, evt):
        # we need focus...
        if evt.key == "DOWN_ARROW":
            self.set_highlighted(self.highlighted + 1)
            if self.highlighted >= len(self.vbox.children):
                self.set_highlighted(0)
        elif evt.key == "UP_ARROW":
            self.set_highlighted(self.highlighted - 1)
            if self.highlighted < 0:
                self.set_highlighted(len(self.vbox.children) - 1)
            repaint(self)
        elif evt.key in ["RIGHT_ARROW", "\t"]:
            fire_event(self, Event("next", menu=self))
        elif evt.key in ["LEFT_ARROW", "REVERSE_TAB"]:
            fire_event(self, Event("previous", menu=self))
        elif evt.key in ["ESC"]:
            self.close()
        elif evt.key == "\r":
            item = self.vbox.children[self.highlighted]
            item.select()
        elif len(evt.key) == 1 and evt.key.isalpha():
            self.highlight_next_starting_with(evt.key)
    
    def highlight_next_starting_with(self, char):
        for i in range(self.highlighted + 1, len(self.vbox.children)):
            item = self.vbox.children[i]
            if item.label.lower().startswith(char.lower()):
                self.set_highlighted(i)
                return
        for i in range(self.highlighted):
            item = self.vbox.children[i]
            if item.label.lower().startswith(char.lower()):
                self.set_highlighted(i)
    
    def set_highlighted(self, value):
        children = self.vbox.children
        if isinstance(value, MenuItem):
            value = children.index(value)
        if value >= len(children):
            value = 0
        children[self.highlighted].set_highlighted(False)
        self.highlighted = value
        children[self.highlighted].set_highlighted(True)
        
    def want_focus(self):
        return True
    
    def on_click(self, evt):
        evt.stop_propagation()
