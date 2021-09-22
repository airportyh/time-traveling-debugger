from oui import add_child, defer_layout, defer_paint, remove_children, has_child
from oui import add_listener, remove_listener, remove_child, BoxConstraints, fire_event
from oui import Event, remove_child, get_root, add_listener_once
from oui.elements import TextField, Border, MenuItem, Menu, VBox, Text
from fuzzy_match import *
from sstring import *

class FunctionSearchBar:
    def __init__(self, cache, container):
        self.cache = cache
        self.container = container
        self.fun_codes = self.cache.get_fun_codes_lite()
        self.vbox = VBox()
        self.label = Text("Go to function, method, or class:")
        add_child(self.vbox, self.label)
        self.text_field = TextField()
        add_listener(self.text_field, "keypress", self.on_keypress)
        add_child(self.vbox, self.text_field, stretch="x")
        self.border = Border(self.vbox)
        add_child(self, self.border)
        self.menu = Menu()
        add_listener_once(get_root(), "click", lambda e: self.close())
    
    def on_keypress(self, evt):
        if evt.key == "ESC":
            remove_child(self.parent, self)
            if self.menu and has_child(self.container, self.menu):
                self.menu.close()
            evt.stop_propagation()
        elif evt.key in ["LEFT_ARROW", "RIGHT_ARROW", "UP_ARROW", "DOWN_ARROW", "\r"]:
            # route these events to the menu
            fire_event(self.menu, evt)
        else:
            query = self.text_field.get_text()
            
            self.menu.remove_items()
            
            if len(query) > 0:
                matches = []
                for fun_code in self.fun_codes:
                    name = fun_code["name"]
                    if fuzzy_match_simple(name, query):
                        result = fuzzy_match_5(name, query)
                        matches.append((fun_code, result))
            else:
                matches = []
            
            if len(matches) > 0:
                for fun_code, result in sorted(matches, key=lambda m: m[1][0], reverse=True):
                    name = fun_code["name"]
                    match_positions = result[1]
                    line_display = sstring("")
                    last_idx = -1
                    for pos in match_positions:
                        line_display += sstring(name[last_idx+1:pos])
                        line_display += sstring(name[pos], [BRIGHT_MAGENTA, BOLD])
                        last_idx = pos
                    line_display += sstring(name[last_idx+1:])
                    
                    code_file = self.cache.get_code_file(fun_code["code_file_id"])
                    filename = self.get_filename(code_file)
                    line_display += sstring("(…)")
                    line_display += sstring(" : " + filename, [YELLOW])
                    self.menu.add_item(MenuItem(line_display, self.on_selected, key=fun_code["id"]))
                x, y = self.region.offset
                width, height = self.size
                cwidth, cheight = self.container.size
                self.menu.layout(BoxConstraints(
                    min_width = width,
                    max_width = width,
                    max_height = cheight
                ))
                if not has_child(self.container, self.menu):
                    add_child(self.container, self.menu, 
                        abs_pos = (x, y + height - 1),
                        abs_size = self.menu.size
                    )
            else:
                if has_child(self.container, self.menu):
                    remove_child(self.container, self.menu)
    
    def on_selected(self, evt):
        fire_event(self, Event("select", value=evt.value.key))
    
    def layout(self, constraints):
        defer_layout(self, self.border, constraints)
    
    def paint(self):
        width, height = self.size
        self.region.clear_rect(0, 0, width, height)
        defer_paint(self, self.border)
    
    def get_filename(self, code_file):
        return code_file["file_path"].split("/")[-1]
    
    def close(self):
        remove_child(self.parent, self)
        