from oui import add_child, BoxConstraints, Region
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
    
    def paint(self):
        width, height = self.size
        region = self.region
        if self.color:
            write('\x1B[%sm' % self.color)
        region.draw(0, 0, "┏" + ("━" * (width - 2)) + "┓")
        for i in range(height - 2):
            region.draw(0, 1 + i, "┃")
            region.draw(width - 1, 1 + i, "┃")
        region.draw(0, height - 1, "┗" + ("━" * (width - 2)) + "┛")
        if self.color:
            write('\x1B[0m')
        child_pos = (1, 1)
        self.content.region = region.child_region(child_pos, self.content.size)
        self.content.paint()
    
    def __repr__(self):
        return "<Border %r>" % self.content