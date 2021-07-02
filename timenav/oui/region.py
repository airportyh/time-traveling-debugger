from term_util import *

class Region:
    def __init__(self, origin, size, offset=None):
        self.origin = origin
        self.size = size
        self.offset = offset or self.origin
    
    def draw(self, x, y, string):
        originx, originy = self.origin
        width, height = self.size
        screenx = originx + x
        screeny = originy + y
        offsetx, offsety = self.offset
        if screeny < offsety or screeny >= offsety + height:
            return
        if screenx >= offsetx + width:
            return
        if screenx < offsetx:
            string_offset = offsetx - screenx
            string = string[string_offset:]
            screenx = offsetx
        if len(string) + x > width:
            string = string[0:width-x]
        print_at(screenx + 1, screeny + 1, str(string))
        
    def clear_rect(self, x, y, width, height):
        originx, originy = self.origin
        rwidth, rheight = self.size
        offsetx, offsety = self.offset
        screenx = originx + x
        screeny = originy + y
        screen_stop_x = min(screenx + width, offsetx + rwidth)
        screen_stop_y = min(screeny + height, offsety + rheight)
        rectx = max(offsetx, screenx)
        recty = max(offsety, screeny)
        rect_width = screen_stop_x - rectx
        rect_height = screen_stop_y - recty
        clear_rect(rectx + 1, recty + 1, rect_width, rect_height)
        
    def child_region(self, child_origin, child_size, child_offset=None):
        originx, originy = self.origin
        offsetx, offsety = self.offset
        width, height = self.size
        coriginx, coriginy = child_origin
        coriginx += originx
        coriginy += originy
        cwidth, cheight = child_size
        if child_offset:
            coffsetx, coffsety = child_offset
            coffsetx += originx
            coffsety += originy
        else:
            coffsetx = max(offsetx, coriginx) - coriginx
            coffsety = max(offsety, coriginy) - coriginy
            # TODO test
        cwidth = min(
            coriginx + cwidth,
            offsetx + width
        ) - coffsetx
        cheight = min(
            coriginy + cheight,
            offsety + height
        ) - coffsety
        return Region(
            (coriginx, coriginy),
            (cwidth, cheight),
            (coffsetx, coffsety)
        )
    
    def contains(self, x, y):
        offsetx, offsety = self.offset
        originx, originy = self.origin
        offsetx += originx
        offsety += originy
        width, height = self.size
        return offsetx <= x and offsety <= y and offsetx + width > x \
            and offsety + height > y
        
    def relative_pos(self, x, y):
        originx, originy = self.origin
        return (x - originx, y - originy)
        