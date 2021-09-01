from sstring import *

class CodePane:
    def __init__(self):
        self.current_line = None
        self.scroll_needed = False
        self.code_file = None
        self.file_lines = None
        self.offset = (0, 0)
    
    def get_content_size(self):
        width = max(map(len, self.file_lines))
        height = len(self.file_lines)
        return (width, height)
    
    def layout(self, constraints):
        cwidth, cheight = self.get_content_size()
        width = constraints.constrain_width(cwidth)
        height = constraints.constrain_height(cheight)
        self.size = (width, height)
        if self.scroll_needed:
            self._scroll_to_current_line_if_needed()
            self.scroll_needed = False
    
    def paint(self):
        if self.code_file["source"] is None:
            return
        width, height = self.size
        xoffset, yoffset = self.offset
        gutter_width = len(str(len(self.file_lines) + 1))
        display_lines = self.file_lines[yoffset:yoffset + height]
        for i, line in enumerate(display_lines):
            line = line.replace("\t", "    ")
            lineno = yoffset + i + 1
            lineno_display = str(lineno).rjust(gutter_width) + ' '
            line_display = (lineno_display + line).ljust(width)
            if self.current_line == lineno:
                line_display = sstring(line_display, [REVERSED])
            self.region.draw(-xoffset, i, line_display)
    
    def set_location(self, code_file, line_no):
        if code_file != self.code_file:
            self.code_file = code_file
            if code_file["source"]:
                self.file_lines = code_file["source"].split("\n")
        self.current_line = line_no

    def get_line_no_for_y(self, y):
        xoffset, yoffset = self.offset
        return yoffset + (y - self.region.offset[1]) + 1
    
    def get_viewport_height(self):
        viewport_width, viewport_height = self.size
        content_width, content_height = self.get_content_size()
        if viewport_width < content_width:
            viewport_height -= 1
        return viewport_height
    
    def on_wheelup(self, evt):
        offsetx, offsety = self.offset
        content_width, content_height = self.get_content_size()
        width, height = self.size
        new_offsety = min(content_height - self.get_viewport_height(), offsety + evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
        return False
    
    def on_wheeldown(self, evt):
        offsetx, offsety = self.offset
        new_offsety = max(0, offsety - evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
        return False

    def scroll_to_current_line_if_needed(self):
        if hasattr(self, "size"):
            self._scroll_to_current_line_if_needed()
        else:
            self.scroll_needed = True
    
    def _scroll_to_current_line_if_needed(self):
        line = self.current_line
        xoffset, yoffset = self.offset
        width, height = self.size
        if line > yoffset + height:
            yoffset = min(
                len(self.file_lines) - height,
                line - height // 2
            )
            self.offset = (xoffset, yoffset)
        if line < (yoffset + 1):
            yoffset = max(0, line - height // 2)
            self.offset = (xoffset, yoffset)
