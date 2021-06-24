from oui import add_child, BoxConstraints, render_all
from term_util import *

class Tree:
    def __init__(self, label):
        self.label = label
        add_child(self, label)
        self.expanded = False
    
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
            
        self.size = (width, height)

    def paint(self, pos):
        self.pos = pos
        x, y = pos
        if len(list(self.child_nodes)) == 0:
            print_at(x, y, "-")
        elif self.expanded:
            print_at(x, y, "▼")
        else:
            print_at(x, y, "▶")
        curr_x = x + 2
        curr_y = y
        for child in self.children:
            child.paint((curr_x, curr_y))
            curr_y += child.size[1]

    def click(self, event):
        indent = 2
        x, y = self.pos
        if event.y == y and event.x >= x and event.x < x + indent:
            self.expanded = not self.expanded
            render_all()

    @property
    def child_nodes(self):
        return filter(lambda c: c != self.label, self.children)

    def is_root(self):
        return not hasattr(self, "parent") or not isinstance(self.parent, Tree)    

    def __repr__(self):
        return "<Tree %r>" % self.label
