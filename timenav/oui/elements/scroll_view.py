from oui import add_child, BoxConstraints, repaint
from ..region import Region
from sstring import *

class ScrollView:
    def __init__(self, content):
        self.content = content
        self.offset = (0, 0)
        add_child(self, self.content)
        self.line_to_ensure_viewable = None
    
    def layout(self, constraints):
        # provide no constraints
        self.content.layout(BoxConstraints())
        cwidth, cheight = self.content.size
        width = constraints.constrain_width(cwidth)
        height = constraints.constrain_height(cheight)
        hscroll = width < cwidth
        vscroll = height < cheight
        if hscroll:
            # we need one more column for the horizontal scroll bar
            height = constraints.constrain_height(cheight + 1)
        if vscroll:
            width = constraints.constrain_width(width + 1)
        self.size = (width, height)
        if self.line_to_ensure_viewable is not None:
            self.do_ensure_line_viewable(self.line_to_ensure_viewable)
            self.line_to_ensure_viewable = None
            
    
    def paint(self):
        width, height = self.size
        viewport_width = self.get_viewport_width()
        viewport_height = self.get_viewport_height()
        content_width, content_height = self.content.size
        offsetx, offsety = self.offset
        
        self.draw_scroll_bars()
        
        content_origin = (-offsetx, -offsety)
        content_size = (viewport_width + offsetx, viewport_height + offsety)
        self.content.region = self.region.child_region(content_origin, content_size)
        self.content.paint()
    
    def draw_scroll_bars(self):
        region = self.region
        width, height = self.size
        content_width, content_height = self.content.size
        offsetx, offsety = self.offset
        vscroll = height < content_height
        hscroll = width < content_width
        
        if vscroll:
            vscroll_offset_percent = offsety / content_height
            vscroll_visible_percent = height / content_height
            vscroll_knob_offset = round(vscroll_offset_percent * height)
            vscroll_scroll_knob_height = round(vscroll_visible_percent * height)
            for i in range(height):
                if i < vscroll_knob_offset:
                    region.draw(width - 1, i, "┃")
                elif i >= vscroll_knob_offset + vscroll_scroll_knob_height:
                    region.draw(width - 1, i, "┃")
                else:
                    region.draw(width - 1, i, sstring(" ", REVERSED))
        
        if hscroll:
            if vscroll:
                hscroll_width = width - 1
            else:
                hscroll_width = width
            hscroll_offset_percent = offsetx / content_width
            hscroll_visible_percent = width / content_width
            hscroll_knob_offset = round(hscroll_offset_percent * width)
            hscroll_scroll_knob_width = round(hscroll_visible_percent * hscroll_width)
            region.draw(0, height - 1, "━" * hscroll_knob_offset)
            region.draw(hscroll_knob_offset, height - 1, sstring(" " * hscroll_scroll_knob_width, REVERSED))
            region.draw(
                hscroll_knob_offset + hscroll_scroll_knob_width, 
                height - 1, 
                "━" * (hscroll_width - (hscroll_knob_offset + hscroll_scroll_knob_width))
            )
    
    def get_viewport_width(self):
        viewport_width, viewport_height = self.size
        content_width, content_height = self.content.size
        if viewport_height < content_height:
            viewport_width -= 1
        return viewport_width
        
    def get_viewport_height(self):
        viewport_width, viewport_height = self.size
        content_width, content_height = self.content.size
        if viewport_width < content_width:
            viewport_height -= 1
        return viewport_height
    
    def on_wheelup(self, evt):
        offsetx, offsety = self.offset
        content_width, content_height = self.content.size
        width, height = self.size
        new_offsety = min(content_height - self.get_viewport_height(), offsety + evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
    
    def on_wheeldown(self, evt):
        offsetx, offsety = self.offset
        new_offsety = max(0, offsety - evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
    
    def on_altwheelup(self, evt):
        offsetx, offsety = self.offset
        content_width, content_height = self.content.size
        width, height = self.size
        new_offsetx = min(content_width - self.get_viewport_width(), offsetx + evt.amount)
        if new_offsetx != offsetx:
            self.offset = (new_offsetx, offsety)
    
    def on_altwheeldown(self, evt):
        offsetx, offsety = self.offset
        new_offsetx = max(0, offsetx - evt.amount)
        if new_offsetx != offsetx:
            self.offset = (new_offsetx, offsety)
            
    def set_offset(self, offset):
        self.offset = offset
    
    def ensure_line_viewable(self, line):
        self.line_to_ensure_viewable = line 
        
    def do_ensure_line_viewable(self, line):
        xoffset, yoffset = self.offset
        width, height = self.size
        content_width, content_height = self.content.size
        if line > yoffset + height - 1:
            yoffset = min(
                content_height - height,
                line - height // 2
            )
            self.offset = (xoffset, yoffset)
        if line < (yoffset + 1):
            yoffset = max(0, line - height // 2)
            self.offset = (xoffset, yoffset)
    
    def get_content_line_for_y(self, y):
        xoffset, yoffset = self.offset
        return yoffset + (y - self.region.offset[1]) + 1