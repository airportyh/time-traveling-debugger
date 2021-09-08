from oui import add_child, repaint, add_listener, fire_event, remove_child, Event
from .vbox import VBox
from .border import Border
from .menu_item import MenuItem
import time

class Menu:
    def __init__(self):
        self.box = VBox(same_item_width=True)
        self.highlighted = 0
        self.popup = Border(self.box, color="36")
        add_child(self, self.popup)
    
    def layout(self, constraints):
        self.popup.layout(constraints)
        self.size = self.popup.size
    
    def paint(self):
        self.popup.region = self.region
        self.popup.paint()
    
    def add_item(self, menu_item):
        add_child(self.box, menu_item)
        add_listener(menu_item, "select", self.on_menu_item_select)
        if self.highlighted == len(self.box.children) - 1:
            menu_item.set_highlighted(True)
        
    def on_menu_item_select(self, evt):
        self.set_highlighted(evt.value)
        self.close()
        
    def close(self):
        remove_child(self.parent, self)
        fire_event(self, Event("close", element=self))
            
    def get_menu_bar(self):
        return self.menu_button.get_menu_bar()
    
    def on_keypress(self, evt):
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
            fire_event(self, Event("next", menu=self))
        elif evt.key in ["LEFT_ARROW", "REVERSE_TAB"]:
            fire_event(self, Event("previous", menu=self))
        elif evt.key in ["ESC"]:
            self.close()
        elif evt.key == "\r":
            item = self.box.children[self.highlighted]
            item.select()
        elif len(evt.key) == 1 and evt.key.isalpha():
            self.highlight_next_starting_with(evt.key)
    
    def on_click(self, evt):
        evt.stop_propagation()
    
    def on_wheelup(self, evt):
        evt.stop_propagation()
    
    def on_wheeldown(self, evt):
        evt.stop_propagation()
    
    def on_mouseup(self, evt):
        evt.stop_propagation()
    
    def on_mousedown(self, evt):
        evt.stop_propagation()
    
    def on_rightmouseup(self, evt):
        evt.stop_propagation()
    
    def on_rightmousedown(self, evt):
        evt.stop_propagation()
    
    def on_mousemove(self, evt):
        evt.stop_propagation()
    
    def on_mousedrag(self, evt):
        evt.stop_propagation()
    
    def on_altwheeldown(self, evt):
        evt.stop_propagation()
    
    def on_altwheelup(self, evt):
        evt.stop_propagation()
    
    def highlight_next_starting_with(self, char):
        for i in range(self.highlighted + 1, len(self.box.children)):
            item = self.box.children[i]
            if item.label.lower().startswith(char.lower()):
                self.set_highlighted(i)
                return
        for i in range(self.highlighted):
            item = self.box.children[i]
            if item.label.lower().startswith(char.lower()):
                self.set_highlighted(i)
    
    def set_highlighted(self, value):
        children = self.box.children
        if isinstance(value, MenuItem):
            value = children.index(value)
        if value >= len(children):
            value = 0
        children[self.highlighted].set_highlighted(False)
        self.highlighted = value
        children[self.highlighted].set_highlighted(True)
        
    def want_focus(self):
        return True
