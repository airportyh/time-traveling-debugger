from sstring import *
from logger import log

class Timeline:
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
        prev_snapshot = None
        next_snapshot = None
        last_filename = None
        for i in range(height):
            snapshot_id = i + yoffset + 1
            snapshot = self.cache.get_snapshot(snapshot_id)
            if snapshot is None:
                break
            code_file, line = self.get_file_and_line_for_snapshot(snapshot)
            line = line.lstrip()
            filename = code_file["file_path"].split("/")[-1]
            prefix = self.calculate_prefix(snapshot)
            line_display = prefix + line
            if last_filename != filename:
                line_display += " (%s)" % filename
            last_filename = filename
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
        
    def get_file_and_line_for_snapshot(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        code_lines = self.cache.get_code_lines(fun_code["code_file_id"])
        code_line = code_lines[snapshot["line_no"] - 1]
        return code_file, code_line
    
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