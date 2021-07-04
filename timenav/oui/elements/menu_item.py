import time
from oui import add_child, repaint, fire_event
from term_util import *
from sstring import *
from events import Event

class MenuItem:
    def __init__(self, label):
        self.label = label
        self.highlighted = False
    
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
    
    def click(self, evt):
        self.fire_select()
    
    def fire_select(self):
        fire_event(self, Event("select", value=self))
