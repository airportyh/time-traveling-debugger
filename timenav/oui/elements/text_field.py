from oui import has_focus, repaint, focus
from term_util import *

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
