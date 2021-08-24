from sstring import *
from term_util import print_at

class TermBuffer:
    def __init__(self, size):
        self.size = size
        width, height = self.size
        self.lines = [sstring(" " * width) for i in range(height)]
        
    def print_at(self, x, y, string):
        width, height = self.size
        if isinstance(string, str):
            string = sstring(string)
        line = self.lines[y]
        if x < 0:
            pre = sstring("")
        else:
            pre = line[0:x]
        post = line[x + len(string):]
        str_len = width - len(pre) - len(post)
        if len(string) > str_len:
            low = 0 if x >= 0 else -x
            high = low + str_len
            string = string[low:high]
        new_line = pre + string + post
        self.lines[y] = new_line
    
    def clear_rect(self, x, y, width, height):
        for i in range(height):
            self.print_at(x, y + i, " " * width)
    
    def draw_to_screen(self):
        for i, line in enumerate(self.lines):
            print_at(1, i + 1, str(line))