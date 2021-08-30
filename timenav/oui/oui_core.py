# Ideas
#
# centering
# test suite?
#   * mock screen?
#   * simulate events
# maybe unify how to represent a position, should it be a 2-tuple or an object
#    with x and y?
# child to parent communication when resizing of a child has to change
# flow box
# how to exit properly?
# hover effects
# multi-line text
# word wrap

# windows/draggable/resizable (done)
# put new region scheme into all elements (one)
# fix popup menu/menu bar (done)
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
from term_buffer import TermBuffer
from logger import log

# Global Varibles
root = None
focused_element = None
original_term_settings = None

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
    # render_all()

def clear_children(parent):
    if not hasattr(parent, "children"):
        return
    for child in parent.children:
        child.parent = parent
    parent.children = []

def remove_child(parent, child):
    global focused_element
    assert child in parent.children
    clen = len(parent.children)
    parent.children.remove(child)
    assert child not in parent.children
    assert len(parent.children) == clen - 1
    child.parent = None
    if child == focused_element:
        focused_element = None
    # render_all()

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

def add_listener_once(element, event_name, handler, front=False):
    def _handler(evt):
        handler(evt)
        remove_listener(element, event_name, _handler)
    add_listener(element, event_name, _handler, front)

def remove_listener(element, event_name, handler):
    method_name = "on_%s" % event_name
    if not hasattr(element, method_name):
        return
    handlers = getattr(element, method_name)
    if not isinstance(handlers, list):
        assert callable(handlers)
        return
    handlers.remove(handler)

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
    if hasattr(element, "region"):
        return element.region.contains(x, y)
    else:
        return False

def fire_mouse_event(element, event, level=0):
    indent = "  " * level
    handled = False
    if contains(element, event.x, event.y):
        if hasattr(element, "children"):
            children = list(element.children)
            for child in reversed(children):
                result = fire_mouse_event(child, event, level + 1)
                handled = handled or result
                if event.propagation_stopped:
                    return handled

        result = fire_event(element, event)
        handled = handled or result
        if event.propagation_stopped:
            return handled
    return handled

def fire_event(element, event, bubble=False):
    def _fire_event(element, event):
        method_name = "on_%s" % event.type
        if hasattr(element, method_name):
            handler = getattr(element, method_name)
            if callable(handler):
                handler(event)
                return True
            else:
                if len(handler) > 0:
                    for h in handler:
                        h(event)
                        if event.immediate_propagation_stopped:
                            break
                    return True
                else:
                    return False
        return False
    handled = _fire_event(element, event)
    if bubble:
        element = element.parent
        while element:
            result = _fire_event(element, event)
            handled = handled or result
            element = element.parent if hasattr(element, "parent") else None
    return handled

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
        buf = TermBuffer((screen_width, screen_height))
        root.layout(BoxConstraints(
            min_width=None,
            max_width=screen_width,
            min_height=None,
            max_height=screen_height
        ))
        root.region = Region((0, 0), (screen_width, screen_height), buf)
        root.paint()
        buf.draw_to_screen()

def defer_layout(parent, child, constraints):
    child.layout(constraints)
    parent.size = child.size

def defer_paint(parent, child):
    child.region = parent.region
    child.paint()

def clean_up():
    restore(original_term_settings)
    mouse_off()
    cursor_on()
    clear_screen()

def quit():
    clean_up()
    exit(0)

def run(root_element, global_key_handler=None):
    global original_term_settings
    # Configuring the encoding to latin1
    # overcomes a UnicodeDecodeError (with utf-8 encoding)
    # which can come if you
    # receive a mouse click event on the far right of the terminal
    # a better solution might be to write a custom decoder
    sys.stdin.reconfigure(encoding='latin1')
    global root
    root = root_element

    original_term_settings = termios.tcgetattr(sys.stdin)

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
            handled = False
            for event in events:
                if event.type == "keypress":
                    result = fire_event(focused_element or root, event)
                    handled = handled or result
                else: # assume these are mouse/wheel events, dispatch it starting at root
                    result = fire_mouse_event(root_element, event)
                    handled = handled or result
            if handled:
                render_all()

    except Exception as e:
        clean_up()
        raise e
    
    clean_up()