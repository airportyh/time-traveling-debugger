from oui import repaint
from term_util import *

class Text:
    def __init__(self, text, strikethrough=False):
        self.text = text
        self.strikethrough = strikethrough
        self.styles = []

    def set_text(self, text):
        self.text = text
        repaint(self)
        
    def set_strikethrough(self, value):
        self.strikethrough = value
        repaint(self)
        
    def layout(self, constraints):
        width = constraints.constrain_width(len(self.text))
        height = constraints.constrain_height(1)
        self.size = (width, height)

    def paint(self, pos):
        self.pos = pos
        x, y = pos
        width, height = self.size
        text = self.text[0:width]
        if self.strikethrough:
            text = strike_through(text)
        
        display = text + " " * (width - len(text))
        if len(self.styles) > 0:
            display = style(display, self.styles[0])
        
        print_at(x, y, display)
    
    def add_style(self, style):
        self.styles.append(style)
        repaint(self)
        
    def remove_style(self, style):
        if style in self.styles:
            self.styles.remove(style)
            repaint(self)
    
    def __repr__(self):
        return "<Text %r>" % self.text