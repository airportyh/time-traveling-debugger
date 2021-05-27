# Ideas
#
# Relative coordinates (no)
# layout phase vs render phase
# child to parent communication when resizing of a child has to change

# Uncertainties
# When should a render occur?
#   Whenever state changes
#   things needed to render
#   * size
#   * content

# Features

# scroll pane
# text centering

# focus
# text fields
# keyboard input
# split (draggable) pane
# button and other hovers
# proper click event
# popups / windows
# dragging / resizing
# flow layout (box wrapping)
# multi-line text
# word wrap
# tapping
# relayout on enter

# stretch (done)
# collapsable tree (done)

# TODO
# Tree - solve expand/collapse
# maybe I need a tree pane?

import termios
import tty
import os
from events import decode_input
from term_util import *
import sys

logfile = open("ui.log", "a")

def log(text):
    logfile.write(text + "\n")
    logfile.flush()

class Label:
    def __init__(self, text):
        self._text = text

    @property
    def text(self):
        return self._text
    
    @text.setter
    def text(self, text):
        self._text = text
        if self.parent and hasattr(self.parent, "child_update"):
            self.parent.child_update(self)
        self.draw()

    def place(self, x, y, max_width, max_height, stretch, level):
        indent = level * "  "
        log(indent + "Label.place(%r, %d, %d, %d, %d, %s)" % (self.text, x, y, max_width, max_height, stretch))
        self.x = x
        self.y = y
        if stretch in ["x", "both"]:
            self.width = max_width
        else:
            self.width = min(max_width, len(self.text))
        if stretch in ["y", "both"]:
            self.height = max_height
        else:
            self.height = 1
        log(indent + "Label.place done (%d, %d)" % (self.width, self.height))

    def draw(self):
        display = self.text[0:self.width].ljust(self.width, " ")
        log("Label.draw(%d, %d, %d, %s)" % (self.x, self.y, self.width, display))
        print_at(self.x, self.y, display)
    
    def __repr__(self):
        return "<Label %r>" % self.text

class Border:
    def __init__(self, content, color=None):
        self.content = content
        self.color = color
        add_child(self, content)

    def place(self, x, y, max_width, max_height, stretch, level):
        indent = level * "  "
        log(indent + "Border.place(%d, %d, %d, %d, %s)" % (x, y, max_width, max_height, stretch))
        self.x = x
        self.y = y
        self.content.place(x + 1, y + 1, max_width - 2, max_height - 2, stretch, level + 1)
        self.width = self.content.width + 2
        self.height = self.content.height + 2
        log(indent + "Border.place done (%d, %d)" % (self.width, self.height))

    def draw(self):
        if self.color:
            write('\x1B[%sm' % self.color)
        print_at(self.x, self.y, "┏" + ("━" * (self.width - 2)) + "┓")
        for i in range(self.height - 2):
            print_at(self.x, self.y + i + 1, "┃")
            print_at(self.x + self.width - 1, self.y + i + 1, "┃")
        print_at(self.x, self.y + self.height - 1, "┗" + ("━" * (self.width - 2)) + "┛")
        if self.color:
            write('\x1B[0m')
    
    def __repr__(self):
        return "<Border %r>" % self.content

class Button:
    def __init__(self, label, **kwargs):
        self.label = label
        self.border = Border(label)
        add_child(self, self.border)
        self.__dict__.update(kwargs)

    def place(self, x, y, max_width, max_height, stretch, level):
        indent = level * "  "
        log(indent + "Button.place(%d, %d, %d, %d, %s)" % (x, y, max_width, max_height, stretch))
        self.border.place(x, y, max_width, max_height, stretch, level + 1)
        self.x = x
        self.y = y
        self.width = self.border.width
        self.height = self.border.height
        log(indent + "Button.place done (%d, %d)" % (self.width, self.height))
    
    def __repr__(self):
        return "<Button %r>" % self.label

class VerticalPanel:
    def place(self, x, y, max_width, max_height, stretch, level):
        indent = level * "  "
        log(indent + "VerticalPanel.place(%d, %d, %d, %d, %s)" % (x, y, max_width, max_height, stretch))
        self.x = x
        self.y = y

        non_stretched = filter(lambda c: not has_stretch_y(c), self.children)
        stretched = filter(has_stretch_y, self.children)
        num_stretched = len(list(stretched))
        non_stretched_height = 0

        for child in non_stretched:
            child.place(self.x, self.y, max_width, max_height, None, level + 1)
            non_stretched_height += child.height

        stretched_height = max_height - non_stretched_height
        stretched_height_per = (stretched_height // num_stretched) if num_stretched > 0 else 0

        y_offset = 0
        my_width = 0
        for child in self.children:
            if has_stretch_y(child):
                child.place(self.x, self.y + y_offset, 
                    max_width, stretched_height_per,
                    get_stretch(child), level + 1)
            else:
                child.place(self.x, self.y + y_offset, 
                    max_width, max_height - y_offset, 
                    get_stretch(child), level + 1)

            y_offset += child.height
            if child.width > my_width:
                my_width = child.width
            if y_offset >= max_height:
                break

        if stretch in ["x", "both"]:
            self.width = max_width
        else:
            self.width = min(max_width, my_width)

        if stretch in ["y", "both"]:
            self.height = max_height
        else:
            self.height = min(max_height, y_offset)

        log(indent + "VerticalPanel.place done (%d, %d)" % (self.width, self.height))

    def child_update(self, child):
        assert child in self.children
        # This could be optimized by starting the placement process
        # only starting at the updated child
        # clear_rect(self.x, self.y, self.width, self.height)
        old_width = self.width
        old_height = self.height
        self.place(self.x, self.y, self.width, self.height, get_stretch(self), 0)
        if old_width != self.width or old_height != self.height:
            child_update = getattr(self.parent, "child_update", None)
            if child_update:
                child_update(self)
        else:
            draw(self)

    def draw(self):
        # Clear rectangle. Not needed if we make all children stretch horizontally
        # and assume they repaint all horizontal space on draw()
        clear_rect(self.x, self.y, self.width, self.height)

class HorizontalPanel:
    def place(self, x, y, max_width, max_height, stretch, level):
        
        # Algorithm
        # 1. Call place() on children who are not stretched horizontally; sum their widths (non_stretch_width)
        # 2. Call place() on on each child (including the ones already processed)
        #    A. if child is stretched horizontally, assign them a max_width of non_stretch_width // n
        #           where n is the number of horizontally stretched elements
        #    B. if child is not stretched horizontally, call place as normal

        indent = level * "  "
        log(indent + "HorizontalPanel.place(%d, %d, %d, %d, %r)" % (x, y, max_width, max_height, stretch))
        self.x = x
        self.y = y

        non_stretched = filter(lambda c: not has_stretch_x(c), self.children)
        stretched = filter(has_stretch_x, self.children)
        num_stretched = len(list(stretched))
        non_stretch_width = 0

        for child in non_stretched:
            # disregard offsets, widths and heights. This is a phony call to
            # place.
            child.place(self.x, self.y, max_width, max_height, None, level + 1)
            non_stretch_width += child.width

        stretch_width = max_width - non_stretch_width
        stretch_width_per = (stretch_width // num_stretched) if num_stretched > 0 else 0

        x_offset = 0
        my_height = 0
        for child in self.children:
            if has_stretch_x(child):
                log(indent + "(A)")
                child.place(self.x + x_offset, self.y, 
                    stretch_width_per, max_height, 
                    get_stretch(child), level + 1)
            else:
                log(indent + "(B)")
                child.place(self.x + x_offset, self.y, 
                    max_width - x_offset, max_height, 
                    get_stretch(child), level + 1)
            
            x_offset += child.width
            if child.height > my_height:
                my_height = child.height
            if x_offset >= max_width:
                break
        
        if stretch in ["x", "both"]:
            self.width = max_width
        else:
            self.width = min(max_width, x_offset)
        
        if stretch in ["y", "both"]:
            self.height = max_height
        else:
            self.height = min(max_height, my_height)

        log(indent + "HorizontalPanel.place done (%d, %d)" % (self.width, self.height))
    
    def child_update(self, child):
        self.place(self.x, self.y, self.width, self.height)
        draw(self)
    
    def draw(self):
        clear_rect(self.x, self.y, self.width, self.height)

# class ScrollPane:
#     def __init__(self, content):
#         self.content = content
#         add_child(self, content)
    
#     def place(self, x, y, max_width, max_height):
#         self.content.place(self.x, self.y, sys.maxsize, sys.maxsize)
#         self.width = max_width
#         self.height = max_height

class Tree:
    def __init__(self, label):
        self.label = label
        add_child(self, label)
        self.expanded = False
    
    def place(self, x, y, max_width, max_height, stretch, level):
        logindent = level * "  "
        log(logindent + "Tree.place(%d, %d, %d, %d, %s)" % (x, y, max_width, max_height, stretch))
        self.x = x
        self.y = y
        self.height = max_height
        y_offset = 0
        indent = 2
        # make room for the handle
        self.label.place(x + indent, self.y, max_width - indent, max_height, stretch, level + 1)
        self.width = self.label.width + indent
        y_offset += self.label.height
        if self.expanded:
            for child in self.child_nodes:
                child.place(self.x + indent, self.y + y_offset, max_width - indent, max_height, stretch, level + 1)
                y_offset += child.height
                if child.width + indent > self.width:
                    self.width = child.width + indent
            self.height = y_offset
        else:
            # revoke placement for all children because we are collapsed
            for child in self.child_nodes:
                unplace(child)
            self.height = self.label.height
        log(logindent + "Tree.place done (%d, %d)" % (self.width, self.height))

    def mouseup(self, event):
        indent = 2
        if event.y == self.y and event.x >= self.x and event.x < self.x + indent:
            self.expanded = not self.expanded
            clear_rect(self.x, self.y, self.width, self.height)
            self.parent.child_update(self)
    
    @property
    def child_nodes(self):
        return filter(lambda c: c != self.label, self.children)
    
    def child_update(self, child):
        self.parent.child_update(self)

    def is_root(self):
        return not hasattr(self, "parent") or not isinstance(self.parent, Tree)

    def draw(self):
        if len(list(self.child_nodes)) == 0:
            print_at(self.x, self.y, "-")
        elif self.expanded:
            print_at(self.x, self.y, "▼")
        else:
            print_at(self.x, self.y, "▶")
    
    def __repr__(self):
        return "<Tree %r>" % self.label

# UI Core Engine

def add_child(parent, child, stretch=None):
    if stretch:
        child.stretch = stretch
    child.parent = parent
    if not hasattr(parent, "children"):
        parent.children = []
    parent.children.append(child)

def num_children(element):
    if not hasattr(element, "children"):
        return 0
    return len(element.children)

def restore(settings):
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, settings)
    write('\x1B[0m')
    print("\n")

def draw(element, level=0):
    termsize = os.get_terminal_size()
    screen_width = termsize.columns
    screen_height = termsize.lines
    indent = "  " * level
    log(indent + "draw(%r)" % element)
    if not is_placed(element):
        log(indent + "not placed")
    elif element.x <= screen_width and element.y <= screen_height:
        if hasattr(element, "draw"):
            log(indent + "actually drawing")
            element.draw()
        else:
            log(indent + "not drawing")
        if hasattr(element, "children"):
            for child in element.children:
                draw(child, level + 1)
    else:
        log(indent + "out of screen (%d, %d)" % (element.x, element.y))

def has_stretch_x(element):
    return get_stretch(element) in ["x", "both"]

def has_stretch_y(element):
    return get_stretch(element) in ["y", "both"]

def get_stretch(element):
    return getattr(element, "stretch", None)

def is_placed(element):
    return hasattr(element, "x") and hasattr(element, "y") \
            and hasattr(element, "width") and hasattr(element, "height")

def unplace(element):
    attrs = ["width", "height", "x", "y"]
    for attr in attrs:
        if hasattr(element, attr):
            delattr(element, attr)

def contains(element, x, y):
    return element.x <= x and element.y <= y and element.x + element.width > x \
        and element.y + element.height > y

def fire(element, event, level=0):
    indent = "  " * level
    # log(indent + "fire(%r, %r)" % (element, event))
    if hasattr(event, "x") and hasattr(event, "y"):
        if is_placed(element) and contains(element, event.x, event.y):
            if hasattr(element, event.type):
                log(indent + "calling handler fn")
                handler_fn = getattr(element, event.type)
                handler_fn(event)
        else:
            return
    
    if hasattr(element, "children"):
        for child in element.children:
            fire(child, event, level + 1)

def run(root_element):
    def clean_up():
        restore(original_settings)
        mouse_off()
        # mouse_motion_off()
        cursor_on()

    original_settings = termios.tcgetattr(sys.stdin)

    try:
        tty.setraw(sys.stdin)
        clear_screen()
        mouse_on()
        # mouse_motion_on()
        cursor_off()
        
        termsize = os.get_terminal_size()
        screen_width = termsize.columns
        screen_height = termsize.lines
        log("screen_width = %d, screen_height = %d" % (screen_width, screen_height))
    
        root_element.place(1, 1, screen_width, screen_height, get_stretch(root_element), 0)
        draw(root_element)
        while True:
            inp = get_input()
            if inp == "\r":
                # rerender
                log("rerendering screen")
                termsize = os.get_terminal_size()
                screen_width = termsize.columns
                screen_height = termsize.lines
                log("screen_width = %d, screen_height = %d" % (screen_width, screen_height))
                root_element.place(1, 1, screen_width, screen_height, get_stretch(root_element), 0)
                draw(root_element)
            if inp == "q":
                break
            else:
                events = decode_input(inp)
                for event in events:
                    fire(root_element, event)

            # draw(root_element)

    except Exception as e:
        clean_up()
        raise e

    clean_up()

