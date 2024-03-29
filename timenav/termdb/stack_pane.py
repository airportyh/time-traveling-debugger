from oui import defer_layout, defer_paint, BoxConstraints
from oui import add_child, add_listener, add_listener_once, fire_event, Event
from oui.elements import Text, VBox, ScrollView, Tree
from logger import log

class StackPane:
    def __init__(self, cache, value_cache):
        self.cache = cache
        self.value_cache = value_cache
        self.snapshot = None
        self.vbox = VBox()
        self.locals_tree = Tree("Locals")
        self.globals_tree = Tree("Globals")
        self.expanded_paths = set()
        
        add_child(self.vbox, self.locals_tree)
        add_child(self.vbox, self.globals_tree)
        add_listener(self.locals_tree, "expand", self.on_expand)
        add_listener(self.locals_tree, "collapse", self.on_expand)
        add_listener(self.globals_tree, "expand", self.on_expand)
        add_listener(self.globals_tree, "collapse", self.on_expand)

        self.scroll_view = ScrollView(self.vbox)
        add_child(self, self.scroll_view)
    
    def layout(self, constraints):
        defer_layout(self, self.scroll_view, constraints)
    
    def paint(self):
        defer_paint(self, self.scroll_view)
    
    def tree_key(self, tree):
        path = []
        while tree and isinstance(tree, Tree):
            path.insert(0, tree.label_text)
            tree = tree.parent
        key = "/".join(path)
        return key
    
    def on_expand(self, evt):
        key = self.tree_key(evt.tree)
        self.expanded_paths.add(key)
    
    def on_collapse(self, evt):
        key = self.tree_key(evt.tree)
        self.expanded_paths.remove(key)
    
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
        self.restore_expanded_paths()
    
    def restore_expanded_paths(self):
        for key in sorted(self.expanded_paths, key=lambda path: len(path)):
            path = key.split("/")
            if path[0] == "Locals":
                self.restore_expanded_path(self.locals_tree, path[1:])
            elif path[0] == "Globals":
                self.restore_expanded_path(self.globals_tree, path[1:])
            else:
                raise Exception("This should not happen")
    
    def restore_expanded_path(self, tree, path):
        if path == []:
            tree.expand()
            return
        key = path[0]
        for child in tree.child_nodes:
            if child.label_text == key:
                self.restore_expanded_path(child, path[1:])
                break
    
    def key_value_for_member(self, version):
        def fun(member):
            key_id = member["key"]
            value_id = member["value"]
            key = self.value_cache.get_value(key_id, version)
            value = self.value_cache.get_value(value_id, version)
            return (key and key["value"] or "None", value)
        return fun
    
    def populate_variable_tree(self, dict_id, var_tree, version):
        members = self.cache.get_members(dict_id)
        member_key_values = map(self.key_value_for_member(version), members)
        for key, value in sorted(member_key_values, key=lambda p: p[0]):
            value_display, expandable = self.render_value(value, version)    
            label = "%s = %s" % (key, value_display)
            sub_tree = Tree(label, expandable=expandable)
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
            elif type_name == "set":
                self.fetch_set(tree, value, version)
        return fetch
    
    def fetch_dict(self, tree, value, version):
        members = self.cache.get_members(value["id"])
        for member in members:
            key_id = member["key"]
            if member["key_type"] == 0: # ref
                key_value = self.value_cache.get_value(key_id, version)
                key_display, _ = self.render_value(key_value, version)
            else:
                key_display = repr(member["key"])
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            value_display, expandable = self.render_value(value, version)
            label = "%s: %s" % (key_display, value_display)
            sub_tree = Tree(label, expandable=expandable)
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
        if dict_id:
            value = self.value_cache.get_value(dict_id, version)
            if not value:
                return
        members = self.cache.get_members(value["id"])
        for member in members:
            key_id = member["key"]
            if member["key_type"] == 0: # ref
                key_value = self.value_cache.get_value(key_id, version)
                key_display = key_value["value"]
            else:
                key_display = repr(member["key"])
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            value_display, expandable = self.render_value(value, version)
            label = "%s = %s" % (key_display, value_display)
            sub_tree = Tree(label, expandable=expandable)
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(value, version))
            add_child(tree, sub_tree)

    def fetch_list_or_tuple(self, tree, value, version):
        members = self.cache.get_members(value["id"])
        for member in members:
            idx = member["key"]
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            value_display, expandable = self.render_value(value, version)
            sub_tree = Tree(value_display, expandable=expandable)
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(value, version))
            add_child(tree, sub_tree)
    
    def fetch_set(self, tree, value, version):
        members = self.cache.get_members(value["id"])
        for member in members:
            key = member["key"]
            if member["key_type"] == 0: #ref
                key_value = self.value_cache.get_value(key, version)
                key_display, expandable = self.render_value(key_value, version)
            else:
                key_display = repr(key)
                expandable = False
            sub_tree = Tree(key_display, expandable=expandable)
            if expandable:
                add_listener_once(sub_tree, "expand", self.fetch_children(key_value, version))
            add_child(tree, sub_tree)
    
    def render_value(self, value, version):
        if value is None:
            return ("None", False)
        tp = value["type_name"]
        if tp == "none":
            return ("None", False)
        elif tp == "<deleted>":
            raise Exception("<deleted> value should have been handled")
        elif tp == "str":
            return ("%r" % value["value"], False)
        elif tp == "int":
            return (value["value"], False)
        elif tp == "float":
            if value["value"] is None:
                value["value"] = float("nan")
            return (value["value"], False)
        elif tp == "bool":
            bool_value = value["value"] == "1"
            return ("%r" % bool_value, False)
        elif tp == "dict":
            return ("{…}", True)
        elif tp in ["list", "tuple", "set"]:
            return self.render_list_tuple_or_set(value, version, tp)
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
            return ("<%s>{…}" % type_name, True)
        elif tp == "<ref>":
            ref_id = int(value["id"])
            value_id = int(value["value"])
            real_value = self.value_cache.get_value(value_id, version)
            return self.render_value(real_value, version)
        elif tp == "function":
            fun_code_id = int(value["value"])
            fun_code = self.cache.get_fun_code(fun_code_id)
            return ("%s()" % fun_code["name"], False)
        elif tp == "module":
            return ("<module>", False)
        elif tp == "<type>":
            type_name = value["value"]
            return ("<class %s>" % type_name, False)
        else:
            return ("[%s] %r" % (tp, value), False)
        
    def render_list_tuple_or_set(self, value, version, tp):
        members = self.cache.get_members(value["id"])
        display_values = []
        if len(members) <= 5:
            auto_expand = True
            for member in members:
                value_id = member["value"]
                value = self.value_cache.get_value(value_id, version)
                display_value, expand = self.render_value(value, version)
                display_values.append(display_value)
                auto_expand = auto_expand and not expand
            if auto_expand:
                if tp == "tuple":
                    return ("(%s)" % ", ".join(display_values), False)
                elif tp == "list":
                    return ("[%s]" % ", ".join(display_values), False)
                elif tp == "set":
                    return ("set(%s)" % ", ".join(display_values), False)
                else:
                    raise Exception("Unhandled type: %s" % tp)
        if tp == "tuple":
            return ("(…)", True)
        elif tp == "list":
            return ("[…]", True)
        elif tp == "set":
            return ("set(…)", True)
        else:
            raise Exception("Unhandled type: %s" % tp)

    def get_custom_type_name(self, type_id, version):
        value = self.value_cache.get_value(type_id, version)
        return value["value"]
        