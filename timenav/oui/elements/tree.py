from oui import add_child, BoxConstraints, render_all, Region, fire_event, Event, num_children
from oui.elements import Text
from term_util import *

class Tree:
    def __init__(self, label_text, expandable=False):
        self.label_text = label_text
        self.label = Text(label_text)
        add_child(self, self.label)
        self.expanded = False
        self.expandable = expandable
    
    def layout(self, constraints):
        max_width = constraints.max_width
        max_height = constraints.max_height
        indent = 2
        available_height = max_height
        width = 0
        height = 0
        
        self.label.layout(BoxConstraints(
            max_height=available_height,
            max_width=max_width and (max_width - indent)
        ))
        cwidth, cheight = self.label.size
        width = max(width, cwidth + 2)
        height += cheight
        if available_height:
            available_height -= self.label.size[1]
        if self.expanded:
            for child in self.child_nodes:
                child.layout(BoxConstraints(
                    max_height=available_height,
                    max_width=max_width and (max_width - indent)
                ))
                cwidth, cheight = child.size
                width = max(width, cwidth + 2)
                height += cheight
                if available_height:
                    available_height -= self.label.size[1]
        else:
            for child in self.child_nodes:
                child.layout(BoxConstraints(
                    min_width=0,
                    max_width=0,
                    min_height=0,
                    max_height=0
                ))
        
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)

    def paint(self):
        region = self.region
        if self.expandable or len(list(self.child_nodes)) > 0:
            if self.expanded:
                region.draw(0, 0, "▼")
            else:
                region.draw(0, 0, "▶")
        else:
            region.draw(0, 0, "•")
        curr_x = 2
        curr_y = 0
        for child in self.children:
            child_origin = (curr_x, curr_y)
            child.region = region.child_region(child_origin, child.size)
            child.paint()
            curr_y += child.size[1]
    
    def remove_child_nodes(self):
        for child_node in self.children[1:]:
            child_node.parent = None
        self.children = self.children[:1]

    def on_click(self, event):
        indent = 2
        eventx, eventy = self.region.relative_pos(event.x, event.y)
        if eventy == 0 and eventx >= 0 and eventx < indent:
            if self.expanded:
                self.collapse()
            else:
                self.expand()

    def expand(self):
        if self.expanded:
            return
        self.expanded = True
        fire_event(self, Event("expand", tree=self), bubble=True)

    def collapse(self):
        if not self.expanded:
            return
        self.expanded = False
        fire_event(self, Event("collapse", tree=self), bubble=True)

    @property
    def child_nodes(self):
        return filter(lambda c: c != self.label, self.children)
