from oui import has_children, has_stretch_y, has_stretch_x, BoxConstraints, Region
from term_util import *
# TODO: bring over logic from vbox

class HBox:
    def layout(self, constraints):
        if not has_children(self):
            self.size = (0, 0)
            return
        if constraints.max_width is not None:
            self.layout_with_stretch(constraints)
        else:
            self.layout_without_stretch(constraints)

    def layout_with_stretch(self, constraints):
        height = 0
        width = 0
        available_width = constraints.max_width
        non_stretch_width = 0
        non_stretch_elements = filter(lambda c: not has_stretch_x(c), self.children)
        stretch_elements = list(filter(has_stretch_x, self.children))
        for element in non_stretch_elements:
            if has_stretch_y(element):
                min_height = constraints.max_height
            else:
                min_height = None
            element.layout(BoxConstraints(
                min_width=None,
                max_width=available_width,
                min_height=min_height,
                max_height=constraints.max_height
            ))
            ewidth, eheight = element.size
            available_width -= ewidth
            width += ewidth
            height = max(height, eheight)
        
        if len(stretch_elements) > 0:
            stretch_width_per = available_width // len(stretch_elements)
            for i, element in enumerate(stretch_elements):
                if i == len(stretch_elements) - 1:
                    use_width = available_width
                else:
                    use_width = stretch_width_per
                if has_stretch_y(element):
                    min_height = constraints.max_height
                else:
                    min_height = None
                element.layout(BoxConstraints(
                    min_width=use_width,
                    max_width=use_width,
                    min_height=min_height,
                    max_height=constraints.max_height
                ))
                ewidth, eheight = element.size
                available_width -= ewidth
                width += ewidth
                height = max(height, eheight)
        
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
                max_width=None,
                min_height=None,
                max_height=constraints.max_height
            ))
            ewidth, eheight = element.size
            width += ewidth
            height = max(height, eheight)
        
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def paint(self):
        region = self.region
        if not has_children(self):
            return
        width, height = self.size
        
        curr_x = 0
        curr_y = 0
        offsetx, offsety = region.offset
        rwidth, rheight = region.size
        for child in self.children:
            child_origin = (curr_x, curr_y)
            child.region = region.child_region(child_origin, child.size)
            child.paint()
            cwidth, cheight = child.size
            # region.clear_rect(curr_x, curr_y + cheight, cwidth, height - cheight)
            curr_x += child.size[0]
