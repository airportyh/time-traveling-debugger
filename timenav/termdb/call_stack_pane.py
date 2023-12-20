from oui import add_child, defer_layout, defer_paint, remove_children
from oui.elements import VBox, Text, ScrollView

class CallStackPane:
    def __init__(self, cache, value_cache):
        self.cache = cache
        self.value_cache = value_cache
        self.vbox = VBox()

        self.scroll_view = ScrollView(self.vbox)
        add_child(self, self.scroll_view)

    def layout(self, constraints):
        defer_layout(self, self.scroll_view, constraints)
    
    def paint(self):
        defer_paint(self, self.scroll_view)
    
    def update(self, snapshot):
        remove_children(self.vbox)
        line_no = snapshot["line_no"]
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        fun_name = fun_code["name"]
        add_child(self.vbox, Text("%s: %d" % (fun_name, line_no)))
        while fun_call["parent_id"]:
            fun_call = self.cache.get_fun_call(fun_call["parent_id"])
            fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
            fun_name = fun_code["name"]
            add_child(self.vbox, Text(fun_name))
            


    