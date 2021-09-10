import time
from oui import add_child, repaint, fire_event
from term_util import *
from sstring import *
from events import Event

class MenuItem:
    def __init__(self, label, on_select=None, key=None):
        self.label = label
        self.highlighted = False
        if on_select:
            self.on_select = on_select
        self.key = key
    
    def set_highlighted(self, value):
        self.highlighted = value
        repaint(self)
        
    def layout(self, constraints):
        width = constraints.constrain_width(len(self.label))
        height = constraints.constrain_height(1)
        self.size = (width, height)
    
    def paint(self):
        width, height = self.size
        display = self.label.ljust(width)
        if self.highlighted:
            display = sstring(display, BG_BRIGHT_CYAN)
        self.region.draw(0, 0, display)
    
    def on_click(self, evt):
        self.select()
    
    def select(self):
        event = Event("select", value=self)
        fire_event(self, event)
