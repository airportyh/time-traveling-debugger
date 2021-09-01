from sstring import *

class Timeline:
    def __init__(self, last_snapshot_id, cache):
        self.last_snapshot_id = last_snapshot_id
        self.cache = cache
        self.offset = (0, 0)
        self.code_file_lines_cache = {}
        self.fun_call_level_map = {}
        self.current_snapshot_id = None
        self.scroll_needed = False

    def layout(self, constraints):
        cwidth, cheight = self.get_content_size()
        width = constraints.constrain_width(cwidth)
        height = constraints.constrain_height(cheight)
        self.size = (width, height)
        if self.scroll_needed:
            self._scroll_to_current_line_if_needed()
            self.scroll_needed = False
    
    def paint(self):
        width, height = self.size
        xoffset, yoffset = self.offset
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
            self.region.draw(-xoffset, i, line_display)
        
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
        code_lines = self.get_code_lines_for_code_file_id(fun_code["code_file_id"])
        return code_lines
    
    def get_code_lines_for_code_file_id(self, code_file_id):
        if code_file_id in self.code_file_lines_cache:
            return self.code_file_lines_cache[code_file_id]
        else:
            code_file = self.cache.get_code_file(code_file_id)
            code_lines = code_file["source"].split("\n")
            self.code_file_lines_cache[code_file_id] = code_lines
            return code_lines
    
    def set_current_snapshot_id(self, snapshot_id):
        self.current_snapshot_id = snapshot_id
    
    def get_content_size(self):
        return (100, self.last_snapshot_id)
    
    def on_wheelup(self, evt):
        offsetx, offsety = self.offset
        content_width, content_height = self.get_content_size()
        width, height = self.size
        new_offsety = min(content_height - self.get_viewport_height(), offsety + evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
        evt.stop_propagation()
    
    def on_wheeldown(self, evt):
        offsetx, offsety = self.offset
        new_offsety = max(0, offsety - evt.amount)
        if new_offsety != offsety:
            self.offset = (offsetx, new_offsety)
        evt.stop_propagation()
    
    def on_altwheelup(self, evt):
        offsetx, offsety = self.offset
        content_width, content_height = self.get_content_size()
        new_offsetx = min(content_width - self.get_viewport_width(), offsetx + evt.amount)
        if new_offsetx != offsetx:
            self.offset = (new_offsetx, offsety)

    def on_altwheeldown(self, evt):
        offsetx, offsety = self.offset
        new_offsetx = max(0, offsetx - evt.amount)
        if new_offsetx != offsetx:
            self.offset = (new_offsetx, offsety)
    
    def get_viewport_height(self):
        viewport_width, viewport_height = self.size
        content_width, content_height = self.get_content_size()
        if viewport_width < content_width:
            viewport_height -= 1
        return viewport_height
        
    def get_viewport_width(self):
        viewport_width, viewport_height = self.size
        content_width, content_height = self.get_content_size()
        if viewport_height < content_height:
            viewport_width -= 1
        return viewport_width
        
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
        
    def scroll_to_current_line_if_needed(self):
        if hasattr(self, "size"):
            self._scroll_to_current_line_if_needed()
        else:
            self.scroll_needed = True
    
    def _scroll_to_current_line_if_needed(self):
        content_width, content_height = self.get_content_size()
        snapshot_id = self.current_snapshot_id
        xoffset, yoffset = self.offset
        width, height = self.size
        if snapshot_id > yoffset + height:
            yoffset = min(
                content_height - height,
                snapshot_id - height // 2
            )
            self.offset = (xoffset, yoffset)
        if snapshot_id < (yoffset + 1):
            yoffset = max(0, snapshot_id - height // 2)
            self.offset = (xoffset, yoffset)

        