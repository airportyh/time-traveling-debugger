from oui import has_children, has_stretch_y, has_stretch_x, BoxConstraints
from term_util import *

class VBox:
    def __init__(self, same_item_width=False):
        self.same_item_width = same_item_width
        
    def layout(self, constraints):
        if not has_children(self):
            self.size = (0, 0)
            return
        if constraints.max_height is not None:
            self.layout_with_stretch(constraints)
        else:
            self.layout_without_stretch(constraints)

    def layout_with_stretch(self, constraints):
        width = 0
        height = 0
        available_height = constraints.max_height
        non_stretch_height = 0
        non_stretch_elements = filter(lambda c: not has_stretch_y(c), self.children)
        stretch_elements = list(filter(has_stretch_y, self.children))
        for element in non_stretch_elements:
            if has_stretch_x(element):
                min_width = constraints.max_width
            else:
                min_width = None
            element.layout(BoxConstraints(
                min_width=min_width,
                max_width=constraints.max_width,
                min_height=None,
                max_height=available_height
            ))
            ewidth, eheight = element.size
            available_height -= eheight
            height += eheight
            width = max(width, ewidth)
        
        if len(stretch_elements) > 0:
            stretch_height_per = available_height // len(stretch_elements)
            for i, element in enumerate(stretch_elements):
                if i == len(stretch_elements) - 1:
                    use_height = available_height
                else:
                    use_height = stretch_height_per
                if has_stretch_x(element):
                    min_width = constraints.max_width
                else:
                    min_width = None
                element.layout(BoxConstraints(
                    min_width=min_width,
                    max_width=constraints.max_width,
                    min_height=use_height,
                    max_height=use_height
                ))
                ewidth, eheight = element.size
                available_height -= eheight
                width = max(width, ewidth)
                height += eheight
        
        if self.same_item_width:
            for element in self.children:
                ewidth, eheight = element.size
                element.layout(BoxConstraints(
                    min_width=width,
                    max_width=width,
                    min_height=eheight,
                    max_height=eheight
                ))
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def layout_without_stretch(self, constraints):
        # we have unlimited height, stretch is disabled
        # because otherwise, we would stretch them to infinity
        width = 0
        height = 0
        for element in self.children:
            element.layout(BoxConstraints(
                min_width=None,
                max_width=constraints.max_width,
                min_height=None,
                max_height=None
            ))
            ewidth, eheight = element.size
            height += eheight
            width = max(width, ewidth)
        
        width = constraints.constrain_width(width)
        height = constraints.contrain_height(height)
        self.size = (width, height)
    
    def paint(self, pos):
        self.pos = pos
        if not has_children(self):
            return
        x, y = self.pos
        width, height = self.size
        clear_rect(x, y, width, height)
        
        curr_x = x
        curr_y = y
        for element in self.children:
            element.paint((curr_x, curr_y))
            curr_y += element.size[1]
