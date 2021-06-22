# Ideas
#
# child to parent communication when resizing of a child has to change
# windows/draggable/resizable
# scroll pane
# centering
# flow box
# how to exit properly?
# Search function within current file
# button and other hovers
# dragging / resizing
# text centering
# multi-line text
# word wrap

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

# TODO
# Tree - solve expand/collapse
# maybe I need a tree pane?

import termios
import tty
import os
from events import decode_input, Event
from term_util import *
import sys
import time

# Based on Flutter's layout algorithm
# https://blog.nornagon.net/ui-layout-algorithms/
# https://flutter.dev/docs/resources/architectural-overview#layout-and-rendering
# https://www.youtube.com/watch?v=UUfXWzp0-DU
class BoxConstraints:
    def __init__(self, min_width=None, max_width=None, min_height=None, max_height=None):
        self.min_width = min_width
        self.max_width = max_width
        self.min_height = min_height
        self.max_height = max_height
    
    def constrain_width(self, width):
        if self.min_width is not None and width < self.min_width:
            width = self.min_width
        if self.max_width is not None and width > self.max_width:
            width = self.max_width
        return width
    
    def constrain_height(self, height):
        if self.min_height is not None and height < self.min_height:
            height = self.min_height
        if self.max_height is not None and height > self.max_height:
            height = self.max_height
        return height

class Text:
    def __init__(self, text, strikethrough=False):
        self.text = text
        self.strikethrough = strikethrough
        self.styles = []

    def set_text(self, text):
        self.text = text
        repaint(self)
        
    def set_strikethrough(self, value):
        self.strikethrough = value
        repaint(self)
        
    def layout(self, constraints):
        width = constraints.constrain_width(len(self.text))
        height = constraints.constrain_height(1)
        self.size = (width, height)

    def paint(self, pos):
        self.pos = pos
        x, y = pos
        width, height = self.size
        text = self.text[0:width]
        if self.strikethrough:
            text = strike_through(text)
        
        display = text + " " * (width - len(text))
        if len(self.styles) > 0:
            display = style(display, self.styles[0])
        
        print_at(x, y, display)
    
    def add_style(self, style):
        self.styles.append(style)
        repaint(self)
        
    def remove_style(self, style):
        if style in self.styles:
            self.styles.remove(style)
            repaint(self)
    
    def __repr__(self):
        return "<Text %r>" % self.text

class Border:
    def __init__(self, content, color=None):
        self.content = content
        self.color = color
        add_child(self, content)
        
    def layout(self, constraints):
        min_width = constraints.min_width
        max_width = constraints.max_width
        min_height = constraints.min_height
        max_height = constraints.max_height
        self.content.layout(BoxConstraints(
            min_width and (min_width - 2),
            max_width and (max_width - 2),
            min_height and (min_height - 2),
            max_height and (max_height - 2)
        ))
        cwidth, cheight = self.content.size
        self.size = (cwidth + 2, cheight + 2)
    
    def paint(self, pos):
        self.pos = pos
        x, y = pos
        width, height = self.size
        if self.color:
            write('\x1B[%sm' % self.color)
        print_at(x, y, "┏" + ("━" * (width - 2)) + "┓")
        for i in range(height - 2):
            print_at(x, y + i + 1, "┃")
            print_at(x + width - 1, y + i + 1, "┃")
        print_at(x, y + height - 1, "┗" + ("━" * (width - 2)) + "┛")
        if self.color:
            write('\x1B[0m')
        self.content.paint((x + 1, y + 1))
    
    def __repr__(self):
        return "<Border %r>" % self.content

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
            curr_x += element.size[0]

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

class TextField:
    def __init__(self, init_text=None, width=10, placeholder=None, on_keypress=None):
        self.text = list(init_text or "")
        self.width = width
        self.placeholder = placeholder
        self.cursor = 0
        self.offset = 0
        self.on_keypress = on_keypress
    
    def layout(self, constraints):
        width = constraints.constrain_width(self.width)
        height = constraints.constrain_height(1)
        self.size = (width, height)
        
    def paint(self, pos):
        self.pos = pos
        width, height = self.size
        x, y = self.pos
        text = self.text
        use_placeholder = self.placeholder and len(text) == 0
        if use_placeholder:
            text = self.placeholder
        display_text = "".join(text[self.offset:]).ljust(width)[0:width]
        
        background = "48;5;242";
        placeholder_color = "38;5;246"
        cursor_background = "44"
        
        if has_focus(self):
            cursor = self.cursor - self.offset
            before_cursor = display_text[0:cursor]
            cursor_char = display_text[cursor]
            after_cursor = display_text[cursor + 1:]
            print_at(x, y, style(before_cursor, background))
            if use_placeholder:
                print_at(x + cursor, y, style(style(cursor_char, placeholder_color), cursor_background))
            else:
                print_at(x + cursor, y, style(cursor_char, cursor_background))
            if use_placeholder:
                print_at(x + cursor + 1, y, style(style(after_cursor, placeholder_color), background))
            else:
                print_at(x + cursor + 1, y, style(after_cursor, background))
        else:
            if use_placeholder:
                print_at(x, y, style(style(display_text, placeholder_color), background))
            else:
                print_at(x, y, style(display_text, background))
    
    def keypress(self, evt):
        if self.on_keypress:
            if self.on_keypress(evt) == False: # prevent default in the style of JS
                return
        width, height = self.size
        if evt.key in ["UP_ARROW", "DOWN_ARROW"]:
            return
        elif evt.key == "LEFT_ARROW":
            self.cursor = max(0, self.cursor - 1)
            if self.offset > self.cursor:
                self.offset = self.cursor
        elif evt.key == "RIGHT_ARROW":
            self.cursor = min(len(self.text), self.cursor + 1)
            if self.cursor >= self.offset + width:
                self.offset = self.cursor + 1 - width
        elif evt.key == "DEL":
            assert self.cursor >= 0 and self.cursor <= len(self.text)
            if self.cursor >= 1:
                del self.text[self.cursor - 1]
                self.cursor -= 1
                if self.cursor < self.offset:
                    self.offset = self.cursor
        elif evt.key == "\t":
            yield_focus(self)
        elif evt.key == "REVERSE_TAB":
            yield_focus_reverse(self)
        elif evt.key == "\r": # don't put enters in a single-line
                              # text field
            pass
        else:
            self.text.insert(self.cursor, evt.key)
            self.cursor += 1
            if self.cursor - self.offset >= width:
                self.offset = (self.cursor + 1) - width
        repaint(self)
        
    def click(self, evt):
        focus(self)
    
    def want_focus(self):
        return True
        
    def get_text(self):
        return "".join(self.text)
    
    def set_text(self, text):
        self.text = list(text)
        if self.cursor > len(self.text):
            self.cursor = len(self.text)
        if self.offset > self.cursor:
            self.offset = self.cursor
        repaint(self)
        
    def __repr__(self):
        return "<TextField %d>" % id(self)

class PopUp:
    def __init__(self, content, x, y):
        self.content = content
        self.x = x
        self.y = y
        add_child(self, content)
    
    def layout(self, constraints):
        termsize = os.get_terminal_size()
        screen_width = termsize.columns
        screen_height = termsize.lines
        self.content.layout(BoxConstraints(
            max_width=screen_width,
            max_height=screen_height
        ))
        # I have no size, so that the parent
        # doesn't count my size in their layout
        self.size = self.content.size
        
    def paint(self, pos):
        # ignore given position, use my own
        self.pos = (self.x, self.y)
        self.content.paint(self.pos)
    
class PopUpMenu:
    def __init__(self):
        self.box = VBox(same_item_width=True)
        self.highlighted = 0
        self.popup = PopUp(Border(self.box, color="36"), 1, 1)
        add_child(self, self.popup)
        self.x = 1
        self.y = 1
    
    def layout(self, constraints):
        self.popup.layout(constraints)
        self.size = self.popup.size
    
    def paint(self, pos):
        self.popup.x = self.x
        self.popup.y = self.y
        self.pos = (self.x, self.y)
        self.popup.paint(pos)
        self.size = self.popup.size
    
    def close(self):
        self.menu_button.close()
    
    def add_item(self, menu_item):
        add_child(self.box, menu_item)
        if self.highlighted == len(self.box.children) - 1:
            menu_item.set_highlighted(True)
            
    def get_menu_bar(self):
        return self.menu_button.get_menu_bar()
    
    def keypress(self, evt):
        # we need focus...
        if evt.key == "DOWN_ARROW":
            self.set_highlighted(self.highlighted + 1)
            if self.highlighted >= len(self.box.children):
                self.set_highlighted(0)
        elif evt.key == "UP_ARROW":
            self.set_highlighted(self.highlighted - 1)
            if self.highlighted < 0:
                self.set_highlighted(len(self.box.children) - 1)
            repaint(self)
        elif evt.key in ["RIGHT_ARROW", "\t"]:
            self.get_menu_bar().activate_next_menu()
        elif evt.key in ["LEFT_ARROW", "REVERSE_TAB"]:
            self.get_menu_bar().activate_prev_menu()
        elif evt.key in ["ESC"]:
            self.close()
        elif evt.key == "\r":
            item = self.box.children[self.highlighted]
            item.select()
        elif len(evt.key) == 1 and evt.key.isalpha():
            self.highlight_next_starting_with(evt.key)
    
    def highlight_next_starting_with(self, char):
        for i in range(self.highlighted + 1, len(self.box.children)):
            item = self.box.children[i]
            if item.label.text.lower().startswith(char.lower()):
                self.set_highlighted(i)
                return
        for i in range(self.highlighted):
            item = self.box.children[i]
            if item.label.text.lower().startswith(char.lower()):
                self.set_highlighted(i)
    
    def set_highlighted(self, value):
        if isinstance(value, MenuItem):
            value = self.box.children.index(value)
        self.box.children[self.highlighted].set_highlighted(False)
        self.highlighted = value
        self.box.children[self.highlighted].set_highlighted(True)
        
    def want_focus(self):
        return True

class MenuItem:
    def __init__(self, label, on_select=None, highlighted=False):
        self.label = label
        self.on_select = on_select
        add_child(self, self.label)
        self.highlighted = highlighted
        self.update_highlighted_style()
    
    def get_menu(self):
        return self.parent.parent.parent.parent
    
    def update_highlighted_style(self):
        highlighted_background = "46;1"
        if self.highlighted:
            self.label.styles.append(highlighted_background)
        else:
            if highlighted_background in self.label.styles:
                self.label.styles.remove(highlighted_background)
    
    def set_highlighted(self, value):
        self.highlighted = value
        self.update_highlighted_style()
        repaint(self)
        
    def layout(self, constraints):
        self.label.layout(constraints)
        self.size = self.label.size
    
    def paint(self, pos):
        self.pos = pos
        self.label.paint(pos)
    
    def click(self, evt):
        self.select()
    
    def select(self):
        menu = self.get_menu()
        menu.set_highlighted(self)
        time.sleep(0.2)
        self.get_menu().close()
        if self.on_select:
            self.on_select()

class MenuButton:
    def __init__(self, label, popup_menu, on_open=None, on_close=None):
        self.label = label
        add_child(self, self.label)
        self.popup_menu = popup_menu
        self.popup_menu.menu_button = self
        self.is_open = False
        self.on_open = on_open
        self.on_close = on_close
    
    def layout(self, constraints):
        self.label.layout(constraints)
        self.size = self.label.size
    
    def paint(self, pos):
        self.pos = pos
        self.label.paint(pos)
    
    def open(self):
        x, y = self.pos
        self.popup_menu.x = x
        self.popup_menu.y = y + 1
        add_child(root, self.popup_menu)
        focus(self.popup_menu)
        self.is_open = True
        selected_background = "46;1"
        self.label.add_style(selected_background)
        if self.on_open:
            self.on_open()
        
    def close(self):
        remove_child(root, self.popup_menu)
        self.is_open = False
        selected_background = "46;1"
        self.label.remove_style(selected_background)
        if self.on_close:
            self.on_close()
        
    def click(self, evt):
        if not self.is_open:
            self.open()
        else:
            self.close()
    
    def get_menu_bar(self):
        return self.parent.parent

class MenuBar:
    def __init__(self):
        self.box = HBox()
        add_child(self, self.box)
    
    def add_menu(self, label, menu):
        def on_open():
            # close other open popup menus
            for button in self.box.children:
                if button != menu_button and button.is_open:
                    button.close()
        menu_button = MenuButton(label, menu, on_open)
        add_child(self.box, menu_button)
    
    def layout(self, constraints):
        self.box.layout(constraints)
        self.size = self.box.size
    
    def paint(self, pos):
        self.pos = pos
        self.box.paint(pos)
    
    def activate_next_menu(self):
        if len(self.box.children) == 0:
            return
        idx = None
        for i, button in enumerate(self.box.children):
            if button.is_open:
                idx = i
                break
        if idx is None:
            idx = 0
        else:
            active = self.box.children[idx]
            active.close()
            idx += 1
        if idx >= len(self.box.children):
            idx = 0
        new_active = self.box.children[idx]
        new_active.open()

    def activate_prev_menu(self):
        idx = None
        for i, button in enumerate(self.box.children):
            if button.is_open:
                idx = i
                break
        if idx is None:
            return
        active = self.box.children[idx]
        active.close()
        idx -= 1
        if idx < 0:
            idx = len(self.box.children) - 1
        new_active = self.box.children[idx]
        new_active.open()

# UI Core Engine

def add_child(parent, child, index=None, stretch=None):
    if stretch:
        child.stretch = stretch
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
    parent.children.remove(child)
    if child == focused_element:
        focused_element = None
    render_all()

def add_handler(element, event_name, handler, front=False):
    if not hasattr(element, event_name):
        handlers = []
        setattr(element, event_name, handlers)
    else:
        handlers = getattr(element, event_name)
        if not isinstance(handlers, list):
            assert callable(handlers)
            handlers = [handlers]
            setattr(element, event_name, handlers)
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
    if hasattr(element, "pos"):
        element.paint(element.pos)

def has_stretch_x(element):
    return get_stretch(element) in ["x", "both"]

def has_stretch_y(element):
    return get_stretch(element) in ["y", "both"]

def get_stretch(element):
    return getattr(element, "stretch", None)

def has_size(element):
    return hasattr(element, "size")

def has_pos(element):
    return hasattr(element, "pos")

def has_children(element):
    return hasattr(element, "children") and len(element.children) > 0

def contains(element, x, y):
    ex, ey = element.pos
    width, height = element.size
    return ex <= x and ey <= y and ex + width > x \
        and ey + height > y

def fire_mouse_event(element, event, level=0):
    indent = "  " * level
    if hasattr(event, "x") and hasattr(event, "y"):
        if has_pos(element) and contains(element, event.x, event.y):
            _fire_event(element, event)
        else:
            return
    
    if hasattr(element, "children"):
        for child in element.children:
            fire_mouse_event(child, event, level + 1)

def fire_keypress(element, event):
    if hasattr(element, event.type):
        _fire_event(element, event)

def _fire_event(element, event):
    if hasattr(element, event.type):
        handler = getattr(element, event.type)
        if callable(handler):
            handler(event)
        else:
            for h in handler:
                if h(event): # returning True disable rest of the handlers
                    return

root = None
focused_element = None

def focus(element):
    global focused_element
    if not hasattr(element, "want_focus") or not element.want_focus():
        return
    prev = focused_element
    focused_element = element
    if prev:
        repaint(prev)
    if has_pos(element):
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
        clear_rect(1, 1, screen_width, screen_height)
        root.layout(BoxConstraints(
            min_width=None,
            max_width=screen_width,
            min_height=None,
            max_height=screen_height
        ))
        root.paint((1, 1))

max_click_gap = 0.250
max_dbl_click_gap = 0.5

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
        
        prev_mousedown = None
        prev_mousedown_tick = None
        prev_click = None
        prev_click_tick = None
        
        focus_next_element_from(root, None)
        render_all()
        quit = False
        while not quit:
            inp = get_input()
            events = decode_input(inp)
            more_events = []
            even_more_events = []
            # codes = list(map(ord, inp))
            # log("Input: %r, %r, %r" % (inp, codes, events))
            for event in events:
                if event.type == "mouseup":
                    if prev_mousedown and (time.time() - prev_mousedown_tick < max_click_gap):
                        if event.x == prev_mousedown.x and event.y == prev_mousedown.y:
                            click_event = Event("click", x=event.x, y=event.y)
                            more_events.append(click_event)
                            prev_mousedown = None
                            prev_mousedown_tick = None
                            prev_click = click_event
                            prev_click_tick = time.time()
                elif event.type == "mousedown":
                    prev_mousedown = event
                    prev_mousedown_tick = time.time()
                
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
                                fire_keypress(focused_element, event)
                else: # assume these are mouse/wheel events, dispatch it starting at root
                    fire_mouse_event(root_element, event)

            for event in more_events:
                if event.type == "click":
                    if prev_click and (time.time() - prev_click_tick < max_dbl_click_gap):
                        if event.x == prev_click.x and event.y == prev_click.y:
                            dbl_click_event = Event("dblclick", x=event.x, y=event.y)
                            even_more_events.append(dbl_click_event)
                            prev_click = None
                            prev_click_tick = None
                    prev_click = event
                    prev_click_tick = time.time()
                fire_mouse_event(root_element, event)
            
            for event in even_more_events:
                fire_mouse_event(root_element, event)

    except Exception as e:
        clean_up()
        raise e
    
    clean_up()

