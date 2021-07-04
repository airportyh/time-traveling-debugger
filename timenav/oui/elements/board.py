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
                cx, cy = self.pos_for_child(child)
                constraints = self.constraints_for_child(child, cx, cy, width, height)
                child.layout(constraints)
        self.size = (width, height)
    
    def pos_for_child(self, child):
        if hasattr(child, "abs_pos"):
            return child.abs_pos
        else:
            return (0, 0)
    
    def constraints_for_child(self, child, cx, cy, width, height):
        constraints = BoxConstraints()
        if hasattr(child, "abs_size"):
            cwidth, cheight = child.abs_size
            constraints.min_width = cwidth
            constraints.max_width = cwidth
            constraints.min_height = cheight
            constraints.max_height = cheight
        else:
            if has_stretch_x(child):
                constraints.min_width = width - cx
                constraints.max_width = width - cx
            if has_stretch_y(child):
                constraints.min_height = height - cy
                constraints.max_height = height - cy
        return constraints
    
    def paint(self):
        if has_children(self):
            for child in self.children:
                pos = self.pos_for_child(child)
                child.region = self.region.child_region(pos, child.size)
                child.paint()
