import os
from oui import has_children, has_stretch_x, has_stretch_y, BoxConstraints, Region

class Board:
    def layout(self, constraints):
        width = 0
        height = 0
        if has_children(self):
            for child in self.children:
                cx, cy = self.pos_for_child(child)
                cconstraints = self.constraints_for_child(child, cx, cy, constraints)
                child.layout(cconstraints)
                cwidth, cheight = child.size
                width = max(width, cwidth + cx)
                height = max(height, cheight + cy)
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def pos_for_child(self, child):
        if hasattr(child, "abs_pos"):
            return child.abs_pos
        else:
            return (0, 0)
    
    def constraints_for_child(self, child, cx, cy, pconstraints):
        constraints = BoxConstraints()
        if hasattr(child, "abs_size"):
            cwidth, cheight = child.abs_size
            constraints.min_width = cwidth
            constraints.max_width = cwidth
            constraints.min_height = cheight
            constraints.max_height = cheight
        else:
            if has_stretch_x(child) and pconstraints.max_width:
                constraints.min_width = pconstraints.max_width - cx
                constraints.max_width = pconstraints.max_width - cx
            if has_stretch_y(child) and pconstraints.max_height:
                constraints.min_height = pconstraints.max_height - cy
                constraints.max_height = pconstraints.max_height - cy
        return constraints
    
    def paint(self):
        if has_children(self):
            for child in self.children:
                pos = self.pos_for_child(child)
                child.region = self.region.child_region(pos, child.size)
                child.paint()
