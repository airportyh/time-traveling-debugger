from term_util import *

class Region:
    def __init__(self, pos, size):
        self.pos = pos
        self.size = size
    
    def draw(self, x, y, string):
        if y < 0:
            return
        xoffset, yoffset = self.pos
        width, height = self.size
        if y >= height:
            return
        if x < 0:
            string = string[-x:]
            x = 0
        screenx = xoffset + x
        screeny = yoffset + y
        if len(string) + x > width:
            string = string[0:width-x]
        print_at(screenx, screeny, str(string))
        
        