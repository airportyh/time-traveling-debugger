from sstring import *

class CodePane2:
    def __init__(self, cache):
        self.cache = cache
        self.code_file = None
        self.current_line = None
    
    def layout(self, constraints):
        file_lines = self.cache.get_code_lines(self.code_file["id"])
        width = max(map(len, file_lines))
        height = len(file_lines)
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def paint(self):
        file_lines = self.cache.get_code_lines(self.code_file["id"])
        if file_lines is None:
            return
        width, height = self.size
        gutter_width = len(str(len(file_lines) + 1))
        xoffset = self.region.offset[0] - self.region.origin[0]
        yoffset = self.region.offset[1] - self.region.origin[1]
        display_lines = file_lines[yoffset:yoffset + height]
        for i, line in enumerate(display_lines):
            line = line.replace("\t", "    ")
            lineno = yoffset + i + 1
            lineno_display = str(lineno).rjust(gutter_width) + ' '
            line_display = (lineno_display + line).ljust(width)
            if self.current_line == lineno:
                line_display = sstring(line_display, [REVERSED])
            self.region.draw(-xoffset, yoffset + i, line_display)
    
    def set_location(self, code_file, line_no):
        if code_file != self.code_file:
            self.code_file = code_file
        self.current_line = line_no