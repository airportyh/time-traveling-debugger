from term_util import *

class Region:
    # both origin and offset are absolute coordinates relative to the screen
    def __init__(self, origin, size, buffer, offset=None):
        self.origin = origin
        self.size = size
        self.buffer = buffer
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
        self.buffer.print_at(screenx, screeny, string)
        
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
        self.buffer.clear_rect(rectx, recty, rect_width, rect_height)
        
    def child_region(self, child_origin, child_size):
        originx, originy = self.origin
        offsetx, offsety = self.offset
        width, height = self.size
        coriginx, coriginy = child_origin
        coriginx += originx
        coriginy += originy
        cwidth, cheight = child_size
        coffsetx = max(offsetx, coriginx)
        coffsety = max(offsety, coriginy)
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
            self.buffer,
            (coffsetx, coffsety)
        )
    
    def contains(self, x, y):
        offsetx, offsety = self.offset
        originx, originy = self.origin
        width, height = self.size
        return offsetx <= x and offsety <= y and offsetx + width > x \
            and offsety + height > y
        
    def relative_pos(self, x, y):
        originx, originy = self.origin
        return (x - originx, y - originy)    

def test_contains():
    region = Region((0, 0), (5, 5))
    assert not region.contains(-1, 0)
    assert not region.contains(0, -1)
    assert region.contains(0, 0)
    assert region.contains(4, 4)
    assert not region.contains(4, 5)
    assert not region.contains(5, 4)
    
def test_contains_with_offset():
    region = Region((0, 0), (5, 5), (2, 2))
    assert not region.contains(1, 2)
    assert not region.contains(2, 1)
    assert region.contains(2, 2)
    assert region.contains(6, 6)
    assert not region.contains(6, 7)
    assert not region.contains(7, 6)

def test_child_region():
    region = Region((1, 1), (5, 5))
    cregion = region.child_region((0, 1), (5, 1))
    assert cregion.origin == (1, 2)
    assert cregion.offset == (1, 2)
    assert cregion.size == (5, 1)

def test_child_region_x_y():
    region = Region((1, 1), (5, 5))
    cregion = region.child_region((1, 1), (5, 1))
    assert cregion.origin == (2, 2)
    assert cregion.offset == (2, 2)
    assert cregion.size == (4, 1)

def test_child_region_with_clip_width():
    region = Region((1, 1), (5, 5))
    cregion = region.child_region((0, 1), (10, 1))
    assert cregion.origin == (1, 2)
    assert cregion.offset == (1, 2)
    assert cregion.size == (5, 1)

def test_child_region_with_clip_height():
    region = Region((1, 1), (5, 5))
    cregion = region.child_region((0, 1), (5, 10))
    assert cregion.origin == (1, 2)
    assert cregion.offset == (1, 2)
    assert cregion.size == (5, 4)

def test_child_region_with_negative_origin():
    # scroll view usecase
    region = Region((1, 1), (5, 5))
    # 3rd parameter 'offset' is relative to the child origin
    cregion = region.child_region((-2, -2), (5, 5))
    assert cregion.origin == (-1, -1)
    assert cregion.offset == (1, 1)
    assert cregion.size == (3, 3)
    assert not cregion.contains(0, 0)

def test():
    test_contains()
    test_contains_with_offset()
    test_child_region()
    test_child_region_x_y()
    test_child_region_with_clip_width()
    test_child_region_with_clip_height()
    test_child_region_with_negative_origin()
    
if __name__ == "__main__":
    test()