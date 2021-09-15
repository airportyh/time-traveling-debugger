from oui import add_child, defer_layout, defer_paint, remove_children, has_child
from oui import add_listener, remove_listener, remove_child, BoxConstraints, fire_event
from oui import Event
from oui.elements import TextField, Border, MenuItem, Menu
from fuzzy_match import *
from sstring import *

class SearchBar:
    def __init__(self, cache, container):
        self.cache = cache
        self.container = container
        self.files = self.cache.get_code_files_lite()
        self.text_field = TextField()
        add_listener(self.text_field, "keypress", self.on_keypress)
        self.border = Border(self.text_field)
        add_child(self, self.border)
        self.file_menu = Menu()
    
    def on_keypress(self, evt):
        if evt.key == "ESC":
            remove_child(self.parent, self)
            if self.file_menu and has_child(self.container, self.file_menu):
                self.file_menu.close()
            evt.stop_propagation()
        elif evt.key in ["LEFT_ARROW", "RIGHT_ARROW", "UP_ARROW", "DOWN_ARROW", "\r"]:
            # route these events to the menu
            fire_event(self.file_menu, evt)
        else:
            query = self.text_field.get_text()
            
            self.file_menu.remove_items()
            
            if len(query) > 0:
                matches = []
                for file in self.files:
                    filename = self.get_filename(file)
                    if fuzzy_match_simple(filename, query):
                        result = fuzzy_match_5(filename, query)
                        matches.append((file, result))
            else:
                matches = []
            
            if len(matches) > 0:
                for code_file, result in sorted(matches, key=lambda m: m[1][0], reverse=True):
                    filename = self.get_filename(code_file)
                    match_positions = result[1]
                    filename_display = sstring("")
                    last_idx = -1
                    for pos in match_positions:
                        filename_display += sstring(filename[last_idx+1:pos])
                        filename_display += sstring(filename[pos], [BRIGHT_MAGENTA, BOLD])
                        last_idx = pos
                    filename_display += sstring(filename[last_idx+1:])
                            
                    self.file_menu.add_item(MenuItem(filename_display, self.on_file_selected, key=code_file["id"]))
                x, y = self.region.offset
                width, height = self.size
                cwidth, cheight = self.container.size
                self.file_menu.layout(BoxConstraints(
                    min_width = width,
                    max_width = width,
                    max_height = cheight
                ))
                if not has_child(self.container, self.file_menu):
                    add_child(self.container, self.file_menu, 
                        abs_pos = (x, y + height - 1),
                        abs_size = self.file_menu.size
                    )
            else:
                if has_child(self.container, self.file_menu):
                    remove_child(self.container, self.file_menu)
    
    def get_filename(self, code_file):
        return code_file["file_path"].split("/")[-1]
    
    def on_file_selected(self, evt):
        fire_event(self, Event("select", value=evt.value.key))
    
    def layout(self, constraints):
        defer_layout(self, self.border, constraints)
    
    def paint(self):
        defer_paint(self, self.border)
    
    
        