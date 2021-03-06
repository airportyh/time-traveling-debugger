# Ideas
#
# put new region scheme into all elements
# fix popup menu/menu bar
# test suite?
#   * mock screen?
#   * simulate events
# maybe unify how to represent a position, should it be a 2-tuple or an object
#    with x and y?
# centering
# child to parent communication when resizing of a child has to change
# windows/draggable/resizable
# flow box
# how to exit properly?
# hover effects
# multi-line text
# word wrap

# change event handler name to on_<event name> so that the element can still use
#   the event name itself as a method name (done)
# rename add_handler to add_listener (done)
# extract click and dblclick logic into events.py (done)
# how to hard-code width and height on an element? (done)
    # Idea: board respects size of its children if set and does not call layout?
    #   but children's children still need layout. Maybe board uses child's size
    #   to strictly constraint its children's layout
# fix oui_scroll_view.py (done)
# write tests for region.py (done)
# fix todo (done)
# bug oui_ex1.py, clicking on tree triggers button too (done)
# store region onto UI element (done)
# fix mouse event handling (done)
# upgrade tree element to regions (done)
# backport vbox fixes into hbox (done)
# scroll view fix flickering when scrolling (don't use clear_rect? buffer?) (done)
# integrate region into paint process (done)
# scroll pane (done)
# implement region that does clipping to boundaries (done)
# implement (peg/cork) board (done)
# resurrect sstring (done)
# make the tree work again (done)
# try having content under the menu bar (done)
# menu items should be stretched (done)
# close menu when item is selected (done)
# have better handling for multiple event listeners (done)
# layout phase vs render phase (done)
# tapping (done)
# popups (done)
# proper click event (done)
# rename Label to Text (done)
# focus (done)
# text fields (done)
# keyboard input (done)
# keyboard navigation of menu items (done)
#  * up and down to navigate items within menu (done)
#  * left and right or tab and reverse tab to navigate menus (done)
#  * global hot key to select first menu (done)
#  * escape to close active menu (done)
#  * type first char to jump to matching menu item (done)
# add MenuItem class (done)
# stretch (done)
# collapsable tree (done)
# Tree - solve expand/collapse (done)

import termios
import tty
import os
from events import decode_input, Event
from term_util import *
import sys
import time
from .box_constraints import BoxConstraints
from .region import Region

# UI Core Engine

def add_child(parent, child, index=None, stretch=None, abs_pos=None, abs_size=None):
    if stretch:
        child.stretch = stretch
    if abs_pos:
        child.abs_pos = abs_pos
    if abs_size:
        child.abs_size = abs_size
    child.parent = parent
    if not hasattr(parent, "children"):
        parent.children = []
    if index is None:
        parent.children.append(child)
    else:
        parent.children.insert(index, child)
    render_all()

def remove_child(parent, child):
    global focused_element
    assert child in parent.children
    child.parent = None
    parent.children.remove(child)
    if child == focused_element:
        focused_element = None
    render_all()

def add_listener(element, event_name, handler, front=False):
    method_name = "on_%s" % event_name
    if not hasattr(element, method_name):
        handlers = []
        setattr(element, method_name, handlers)
    else:
        handlers = getattr(element, method_name)
        if not isinstance(handlers, list):
            assert callable(handlers)
            handlers = [handlers]
            setattr(element, method_name, handlers)
    if front:
        handlers.insert(0, handler)
    else:
        handlers.append(handler)

def num_children(element):
    if not hasattr(element, "children"):
        return 0
    return len(element.children)

def restore(settings):
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, settings)
    write('\x1B[0m')
    print("\n")

def repaint(element):
    if hasattr(element, "region"):
        element.paint()

def has_stretch_x(element):
    return get_stretch(element) in ["x", "both"]

def has_stretch_y(element):
    return get_stretch(element) in ["y", "both"]

def get_stretch(element):
    return getattr(element, "stretch", None)

def has_size(element):
    return hasattr(element, "size")

def has_children(element):
    return hasattr(element, "children") and len(element.children) > 0

def contains(element, x, y):
    return element.region.contains(x, y)

def fire_mouse_event(element, event, level=0):
    indent = "  " * level
    if hasattr(event, "x") and hasattr(event, "y"):
        if contains(element, event.x, event.y):
            fire_event(element, event)
        else:
            return
    
    if hasattr(element, "children"):
        for child in element.children:
            fire_mouse_event(child, event, level + 1)

def fire_event(element, event):
    method_name = "on_%s" % event.type
    if hasattr(element, method_name):
        handler = getattr(element, method_name)
        if callable(handler):
            handler(event)
        else:
            for h in handler:
                if h(event): # returning True disable rest of the handlers
                    return

root = None
focused_element = None

def get_root():
    return root

def focus(element):
    global focused_element
    if not hasattr(element, "want_focus") or not element.want_focus():
        return
    prev = focused_element
    focused_element = element
    if prev:
        repaint(prev)
    repaint(element)

def has_focus(element):
    return focused_element == element
    
def yield_focus(element):
    if hasattr(element, "parent") and element.parent:
        gave_focus = focus_next_element_from(element.parent, element)
        if not gave_focus:
            focus_next_element_from(root, None)

def focus_next_element_from(container, from_child):
    if not hasattr(container, "children"):
        return False
    if from_child:
        start_idx = container.children.index(from_child) + 1
    else:
        start_idx = 0
    for i in range(start_idx, len(container.children)):
        child = container.children[i]
        if hasattr(child, "want_focus") and child.want_focus():
            focus(child)
            return True
        else:
            if focus_next_element_from(child, None):
                return True

def yield_focus_reverse(element):
    if hasattr(element, "parent") and element.parent:
        gave_focus = focus_prev_element_from(element.parent, element)
        if not gave_focus:
            focus_prev_element_from(root, None)

def focus_prev_element_from(container, from_child):
    if not hasattr(container, "children"):
        return False
    if from_child:
        start_idx = container.children.index(from_child) - 2
    else:
        start_idx = len(container.children) - 1
    for i in range(start_idx, -1, -1):
        child = container.children[i]
        if hasattr(child, "want_focus") and child.want_focus():
            focus(child)
            return True
        else:
            if focus_prev_element_from(child, None):
                return True

def render_all():
    termsize = os.get_terminal_size()
    screen_width = termsize.columns
    screen_height = termsize.lines
    if root:
        # TODO, switch to using region for clear_rect
        clear_rect(1, 1, screen_width, screen_height)
        root.layout(BoxConstraints(
            min_width=None,
            max_width=screen_width,
            min_height=None,
            max_height=screen_height
        ))
        root.region = Region((0, 0), (screen_width, screen_height))
        root.paint()

def run(root_element, global_key_handler=None):
    global root
    root = root_element
    def clean_up():
        restore(original_settings)
        mouse_off()
        cursor_on()

    original_settings = termios.tcgetattr(sys.stdin)

    try:    
        tty.setraw(sys.stdin)
        clear_screen()
        mouse_on()
        cursor_off()
        
        focus_next_element_from(root, None)
        render_all()
        quit = False
        while not quit:
            inp = get_input()
            events = decode_input(inp, (33, 33))
            # codes = list(map(ord, inp))
            # log("Input: %r, %r, %r" % (inp, codes, events))
            for event in events:
                if event.type == "keypress":
                    prevent_default = False
                    if global_key_handler:
                        result = global_key_handler(event)
                        if result == False:
                            prevent_default = True
                    if not prevent_default:
                        if event.key == "q":
                            quit = True
                            break
                        else:
                            # dispatch to focused_element
                            if focused_element:
                                fire_event(focused_element, event)
                else: # assume these are mouse/wheel events, dispatch it starting at root
                    fire_mouse_event(root_element, event)

    except Exception as e:
        clean_up()
        raise e
    
    clean_up()