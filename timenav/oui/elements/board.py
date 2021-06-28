import os
from oui import has_children, has_stretch_x, has_stretch_y, BoxConstraints, Region

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
                    constraints.min_width = width - cx
                    constraints.max_width = width - cx
                if has_stretch_y(child):
                    constraints.min_height = height - cy
                    constraints.max_height = height - cy
                child.layout(constraints)
        self.size = (width, height)
    
    def paint(self, region, pos):
        self.pos = pos
        if has_children(self):
            for child in self.children:
                child_region = Region(child.pos, child.size)
                child.paint(child_region, child.pos)
