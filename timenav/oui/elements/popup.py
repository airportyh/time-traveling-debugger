from oui import add_child, BoxConstraints
from term_util import *
import os

class PopUp:
    def __init__(self, content, x, y):
        self.content = content
        self.x = x
        self.y = y
        add_child(self, content)
    
    def layout(self, constraints):
        termsize = os.get_terminal_size()
        screen_width = termsize.columns
        screen_height = termsize.lines
        self.content.layout(BoxConstraints(
            max_width=screen_width,
            max_height=screen_height
        ))
        # I have no size, so that the parent
        # doesn't count my size in their layout
        self.size = self.content.size
        
    def paint(self, pos):
        # ignore given position, use my own
        self.pos = (self.x, self.y)
        self.content.paint(self.pos)
