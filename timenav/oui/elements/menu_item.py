import time
from oui import add_child, repaint
from term_util import *

class MenuItem:
    def __init__(self, label, on_select=None, highlighted=False):
        self.label = label
        self.on_select = on_select
        add_child(self, self.label)
        self.highlighted = highlighted
        self.update_highlighted_style()
    
    def get_menu(self):
        return self.parent.parent.parent.parent
    
    def update_highlighted_style(self):
        highlighted_background = "46;1"
        if self.highlighted:
            self.label.styles.append(highlighted_background)
        else:
            if highlighted_background in self.label.styles:
                self.label.styles.remove(highlighted_background)
    
    def set_highlighted(self, value):
        self.highlighted = value
        self.update_highlighted_style()
        repaint(self)
        
    def layout(self, constraints):
        self.label.layout(constraints)
        self.size = self.label.size
    
    def paint(self, pos):
        self.pos = pos
        self.label.paint(pos)
    
    def click(self, evt):
        self.select()
    
    def select(self):
        menu = self.get_menu()
        menu.set_highlighted(self)
        time.sleep(0.2)
        self.get_menu().close()
        if self.on_select:
            self.on_select()
