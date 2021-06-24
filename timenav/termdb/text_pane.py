from term_util import *
class Box:
    def __init__(self, left, top, width, height):
        self.left = left
        self.top = top
        self.width = width
        self.height = height

class TextPane:
    def __init__(self, box):
        self.box = box
        self.lines = []
        self.highlighted = None
        self.top_offset = 0
        self.left_offset = 0

    def set_lines(self, lines):
        self.lines = lines
        self.render()

    def set_highlight(self, highlighted):
        self.highlighted = highlighted
        self.render()
        
    def scroll_up(self):
        self.scroll_top_to(self.top_offset + 1)
    
    def scroll_down(self):
        self.scroll_top_to(self.top_offset - 1)

    def scroll_left(self):
        self.scroll_left_to(self.left_offset - 1)
    
    def scroll_right(self):
        self.scroll_left_to(self.left_offset + 1)
        
    def scroll_top_to(self, offset):
        self.top_offset = max(0, min(offset, len(self.lines) - self.box.height))
        self.render()

    def scroll_left_to(self, offset):
        longest_length = max(*map(len, self.lines))
        self.left_offset = max(0, min(longest_length - self.box.width, offset))
        self.render()

    def render(self):
        display_lines = self.lines
        if self.top_offset > 0:
            display_lines = display_lines[self.top_offset:]
        if self.left_offset > 0:
            display_lines = list(map(lambda line: line[self.left_offset:], display_lines))
        for i in range(self.box.height):
            if i < len(display_lines):
                line = display_lines[i]
            else:
                line = ''
            line = line[0:self.box.width].ljust(self.box.width)
            if self.highlighted == self.top_offset + i:
                line = '\u001b[47m\u001b[30m' + line + '\u001b[0m'
            x = self.box.left
            y = self.box.top + i
            goto(x, y)
            write(line)
    
    def get_line_no_for_y(self, y):
        return self.top_offset + (y - self.box.top) + 1