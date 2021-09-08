from sstring import *
from logger import log

class Timeline2:
    def __init__(self, last_snapshot_id, cache):
        self.last_snapshot_id = last_snapshot_id
        self.cache = cache
        self.fun_call_level_map = {}
        self.current_snapshot_id = None
        
    def set_current_snapshot_id(self, snapshot_id):
        self.current_snapshot_id = snapshot_id
        
    def layout(self, constraints):
        width = 500
        height = self.last_snapshot_id
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def paint(self):
        xoffset = self.region.offset[0] - self.region.origin[0]
        yoffset = self.region.offset[1] - self.region.origin[1]
        width = self.size[0]
        height = self.region.size[1]
        gutter_width = len(str(self.last_snapshot_id))
        prev_snapshot = None
        next_snapshot = None
        for i in range(height):
            snapshot_id = i + yoffset + 1
            snapshot = self.cache.get_snapshot(snapshot_id)
            line = self.get_line_for_snapshot(snapshot).lstrip()
            lineno_display = str(snapshot_id).rjust(gutter_width) + " "
            prefix = self.calculate_prefix(snapshot)
            line_display = lineno_display + prefix + line
            if self.current_snapshot_id == snapshot_id:
                line_display = sstring(line_display.ljust(width), [REVERSED])
            self.region.draw(-xoffset, yoffset + i, line_display)
    
    def calculate_prefix(self, snapshot):
        snapshot_id = snapshot["id"]
        prev_snapshot = snapshot_id > 1 and self.cache.get_snapshot(snapshot_id - 1)
        next_snapshot = snapshot_id < self.last_snapshot_id and self.cache.get_snapshot(snapshot_id + 1)
        last_level = prev_snapshot and self.get_fun_call_level(prev_snapshot["fun_call_id"]) or 0
        next_level = next_snapshot and self.get_fun_call_level(next_snapshot["fun_call_id"]) or 0
        level = self.get_fun_call_level(snapshot["fun_call_id"])
        if level > 0:
            if level < last_level:
                prefix = " ┃  " * (level - 1) + " ┣━ "
            else:
                if level > next_level:
                    prefix = " ┃  " * (level - 1) + " ┗━ "
                elif level == next_level:
                    prefix = " ┃  " * (level - 1) + " ┣━ "
                else:
                    prefix = " ┃  " * (level - 1) + " ┣━ "
        else:
            prefix = ""
        return prefix
        
    def get_line_for_snapshot(self, snapshot):
        code_lines = self.get_code_lines_for_snapshot(snapshot)
        return code_lines[snapshot["line_no"] - 1]
    
    def get_code_lines_for_snapshot(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_lines = self.cache.get_code_lines(fun_code["code_file_id"])
        return code_lines
    
    def get_fun_call_level(self, fun_call_id):
        if fun_call_id in self.fun_call_level_map:
            return self.fun_call_level_map[fun_call_id]
        fun_call = self.cache.get_fun_call(fun_call_id)
        if fun_call["parent_id"] == None:
            retval = 0
        else:
            retval = 1 + self.get_fun_call_level(fun_call["parent_id"])
        self.fun_call_level_map[fun_call_id] = retval
        return retval