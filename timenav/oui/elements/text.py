from oui import repaint
from term_util import *
from sstring import sstring

class Text:
    def __init__(self, text):
        self.text = text
        self.styles = None

    def set_text(self, text):
        self.text = text
        repaint(self)
        
    def layout(self, constraints):
        width = constraints.constrain_width(len(self.text))
        height = constraints.constrain_height(1)
        self.size = (width, height)

    def paint(self):
        width, height = self.size
        display = self.text.ljust(width)
        if self.styles and len(self.styles) > 0:
            display = sstring(display, self.styles)
        self.region.draw(0, 0, display)
    
    def set_styles(self, styles):
        self.styles = styles
    
    def __repr__(self):
        return "<Text %r>" % self.text