from oui import add_child, BoxConstraints
from term_util import *

class Border:
    def __init__(self, content, color=None):
        self.content = content
        self.color = color
        add_child(self, content)
        
    def layout(self, constraints):
        min_width = constraints.min_width
        max_width = constraints.max_width
        min_height = constraints.min_height
        max_height = constraints.max_height
        self.content.layout(BoxConstraints(
            min_width and (min_width - 2),
            max_width and (max_width - 2),
            min_height and (min_height - 2),
            max_height and (max_height - 2)
        ))
        cwidth, cheight = self.content.size
        self.size = (cwidth + 2, cheight + 2)
    
    def paint(self, pos):
        self.pos = pos
        x, y = pos
        width, height = self.size
        if self.color:
            write('\x1B[%sm' % self.color)
        print_at(x, y, "┏" + ("━" * (width - 2)) + "┓")
        for i in range(height - 2):
            print_at(x, y + i + 1, "┃")
            print_at(x + width - 1, y + i + 1, "┃")
        print_at(x, y + height - 1, "┗" + ("━" * (width - 2)) + "┛")
        if self.color:
            write('\x1B[0m')
        self.content.paint((x + 1, y + 1))
    
    def __repr__(self):
        return "<Border %r>" % self.content