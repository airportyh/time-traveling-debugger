from oui import defer_layout, defer_paint, BoxConstraints
from oui import add_child, clear_children, add_listener_once, fire_event, Event
from oui.elements import Text, VBox, ScrollView
from logger import log

class Tree:
    def __init__(self, label, expandable=False):
        self.label = label
        add_child(self, label)
        self.expanded = False
        self.expandable = expandable
    
    def layout(self, constraints):
        max_width = constraints.max_width
        max_height = constraints.max_height
        indent = 2
        available_height = max_height
        width = 0
        height = 0
        
        self.label.layout(BoxConstraints(
            max_height=available_height,
            max_width=max_width and (max_width - indent)
        ))
        cwidth, cheight = self.label.size
        width = max(width, cwidth + 2)
        height += cheight
        if available_height:
            available_height -= self.label.size[1]
        if self.expanded:
            for child in self.child_nodes:
                child.layout(BoxConstraints(
                    max_height=available_height,
                    max_width=max_width and (max_width - indent)
                ))
                cwidth, cheight = child.size
                width = max(width, cwidth + 2)
                height += cheight
                if available_height:
                    available_height -= self.label.size[1]
        else:
            for child in self.child_nodes:
                child.layout(BoxConstraints(
                    min_width=0,
                    max_width=0,
                    min_height=0,
                    max_height=0
                ))
        
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)

    def paint(self):
        region = self.region
        if not self.expandable or len(self.children) == 0:
            region.draw(0, 0, "•")
        elif self.expanded:
            region.draw(0, 0, "▼")
        else:
            region.draw(0, 0, "▶")
        curr_x = 2
        curr_y = 0
        for child in self.children:
            child_origin = (curr_x, curr_y)
            child.region = region.child_region(child_origin, child.size)
            child.paint()
            curr_y += child.size[1]
    
    def remove_child_nodes(self):
        for child_node in self.children[1:]:
            child_node.parent = None
        self.children = self.children[:1]

    def on_click(self, event):
        indent = 2
        eventx, eventy = self.region.relative_pos(event.x, event.y)
        if eventy == 0 and eventx >= 0 and eventx < indent:
            if self.expanded:
                self.expanded = False
                fire_event(self, Event("collapse", tree=self))
            else:
                self.expanded = True
                fire_event(self, Event("expand", tree=self))

    @property
    def child_nodes(self):
        return filter(lambda c: c != self.label, self.children)

class StackPane:
    def __init__(self, cache, value_cache):
        self.cache = cache
        self.value_cache = value_cache
        self.snapshot = None
        self.vbox = VBox()
        self.locals_tree = Tree(Text("Locals"))
        self.globals_tree = Tree(Text("Globals"))
        add_child(self.vbox, self.locals_tree)
        add_child(self.vbox, self.globals_tree)
        add_child(self, self.vbox)
    
    def update(self, snapshot):
        self.snapshot = snapshot
        self.locals_tree.remove_child_nodes()
        self.globals_tree.remove_child_nodes()
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        version = snapshot["id"]
        locals_id = fun_call["locals"]
        globals_id = fun_call["globals"]
        
        self.populate_variable_tree(locals_id, self.locals_tree, version)
        self.populate_variable_tree(globals_id, self.globals_tree, version)
    
    def populate_variable_tree(self, dict_id, var_tree, version):
        members = self.cache.get_members(dict_id)
        for member in members:
            key_id = member["key"]
            value_id = member["value"]
            key = self.value_cache.get_value(key_id, version)
            value = self.value_cache.get_value(value_id, version)
            value_display = self.render_value(value, version)    
            expandable = self.is_value_expandable(value, version)
            sub_tree = Tree(
                Text("%s = %s" % (key and key["value"], value_display)), 
                expandable=expandable
            )
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(value, version))
            add_child(var_tree, sub_tree)
        var_tree.expanded = True
    
    def fetch_children(self, value, version):
        def fetch(evt):
            nonlocal value
            nonlocal version
            tree = evt.tree
            type_name = value["type_name"]
            if type_name == "<ref>":
                value = self.value_cache.get_value(value["value"], version)
                type_name = value["type_name"]
            if type_name == "dict":
                self.fetch_dict(tree, value, version)
            elif type_name == "object":
                self.fetch_object(tree, value, version)
            elif type_name in ["list", "tuple"]:
                self.fetch_list_or_tuple(tree, value, version)
        return fetch
    
    def fetch_dict(self, tree, value, version):
        members = self.cache.get_members(value["id"])
        for member in members:
            key_id = member["key"]
            key_value = self.value_cache.get_value(key_id, version)
            key_display = self.render_value(key_value, version)
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            value_display = self.render_value(value, version)
            expandable = self.is_value_expandable(value, version)
            sub_tree = Tree(
                Text("%s: %s" % (key_display, value_display)),
                expandable=expandable
            )
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(value, version))
            add_child(tree, sub_tree)
    
    def fetch_object(self, tree, value, version):
        data = value["value"].split(" ")
        if len(data) == 1:
            type_id = data[0]
            dict_id = None
        elif len(data) == 2:
            type_id, dict_id = data
        else:
            raise Exception("Object value has more than 2 values %r" % value)
        type_name = self.get_custom_type_name(type_id, version)
        if dict_id:
            dict_value = self.value_cache.get_value(dict_id, version)
            if dict_value:
                self.fetch_dict(tree, dict_value, version)
    
    def fetch_list_or_tuple(self, tree, value, version):
        members = self.cache.get_members(value["id"])
        for member in members:
            idx = member["key"]
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            value_display = self.render_value(value, version)
            expandable = self.is_value_expandable(value, version)
            sub_tree = Tree(
                Text(value_display),
                expandable=expandable
            )
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(value, version))
            add_child(tree, sub_tree)
    
    def render_value(self, value, version):
        if value is None:
            return "None"
        tp = value["type_name"]
        if tp == "none":
            return "None"
        elif tp == "<deleted>":
            raise Exception("<deleted> value should have been handled")
        elif tp == "str":
            return "%r" % value["value"]
        elif tp == "int":
            return value["value"]
        elif tp == "float":
            if value["value"] is None:
                value["value"] = float("nan")
            return value["value"]
        elif tp == "bool":
            bool_value = value["value"] == "1"
            return "%r" % bool_value
        elif tp == "dict":
            return "{…}"
        elif tp == "list":
            return "[…]"
        elif tp == "tuple":
            return "(…)"
        elif tp == "object":
            data = value["value"].split(" ")
            if len(data) == 1:
                type_id = data[0]
                dict_id = None
            elif len(data) == 2:
                type_id, dict_id = data
            else:
                raise Exception("Object value has more than 2 values %r" % value)
            type_name = self.get_custom_type_name(type_id, version)
            return "<%s>{…}" % type_name
        elif tp == "<ref>":
            ref_id = int(value["id"])
            value_id = int(value["value"])
            real_value = self.value_cache.get_value(value_id, version)
            return self.render_value(real_value, version)
        elif tp == "function":
            fun_code_id = int(value["value"])
            fun_code = self.cache.get_fun_code(fun_code_id)
            return "%s()" % fun_code["name"]
        elif tp == "module":
            return "<module>"
        elif tp == "<type>":
            type_name = value["value"]
            return "<class %s>" % type_name
        else:
            return "[%s] %r" % (tp, value)
    
    def is_value_expandable(self, value, version):
        if value is None:
            return False
        tp = value["type_name"]
        if tp in ["none", "str", "<deleted>", "int", "float", "bool", "function", "module", "<type>"]:
            return False
        elif tp == "<ref>":
            ref_id = int(value["id"])
            value_id = int(value["value"])
            real_value = self.value_cache.get_value(value_id, version)
            return self.is_value_expandable(real_value, version)
        else:
            return True
        
    def get_custom_type_name(self, type_id, version):
        value = self.value_cache.get_value(type_id, version)
        return value["value"]

    def layout(self, constraints):
        defer_layout(self, self.vbox, constraints)
    
    def paint(self):
        defer_paint(self, self.vbox)
        