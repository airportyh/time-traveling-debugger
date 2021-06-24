import os
from oui import has_children, has_stretch_x, has_stretch_y, BoxConstraints

class Board:
    def layout(self, constraints):
        width = constraints.max_width
        height = constraints.max_height
        if width is None or height is None:
            termsize = os.get_terminal_size()
            width = width or termsize.columns
            height = height or termsize.lines
        if has_children(self):
            for child in self.children:
                if not hasattr(child, "pos"):
                    child.pos = (1, 1)
                cx, cy = child.pos
                constraints = BoxConstraints()
                if has_stretch_x(child):
                    constraints.min_width = width - cx + 1
                    constraints.max_width = width - cx + 1
                if has_stretch_y(child):
                    constraints.min_height = height - cy + 1
                    constraints.max_height = height - cy + 1
                child.layout(constraints)
        self.size = (width, height)
    
    def paint(self, pos):
        if has_children(self):
            for child in self.children:
                child.paint(child.pos)
