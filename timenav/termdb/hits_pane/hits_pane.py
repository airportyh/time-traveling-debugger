# Todo
# cursor/selection and keyboard navigation
# display some inlined variable values
# add Nones to distinguishing features

from oui import fire_event, Event, add_child, defer_layout, defer_paint
from oui.elements import ScrollView
from sstring import *
import random
from termdb.code_file import get_filename
from see_code2.group_attributes import *

class HitsPane:
    def __init__(self, code_file, line_no, cache, nav, cursor, value_cache):
        self.hits_list = HitsList(code_file, line_no, cache, nav, cursor, value_cache)
        self.scroll_view = ScrollView(self.hits_list)
        add_child(self, self.scroll_view)
    
    def layout(self, constraints):
        defer_layout(self, self.scroll_view, constraints)
    
    def paint(self):
        defer_paint(self, self.scroll_view)
    
    def set_current_snapshot_id(self, snapshot_id):
        self.hits_list.set_current_snapshot_id(snapshot_id)

class HitsList:
    def __init__(self, code_file, line_no, cache, nav, cursor, value_cache):
        self.code_file = code_file
        self.line_no = line_no
        self.cache = cache
        self.value_cache = value_cache
        self.value_fetcher = ValueFetcher(cursor, self.value_cache)
        self.nav = nav
        self.current_snapshot_id = None
        self.load()
        
    def load(self):
        code_lines = self.cache.get_code_lines(self.code_file["id"])
        self.line = code_lines[self.line_no - 1].strip()
        
        self.snapshots = self.nav.get_hits(self.code_file["id"], self.line_no)
        refs = find_vars(self.line)
        self.vars = list(map(lambda ref: ref[0], refs))
        self.attrs_to_use = self.get_distinguishing_attributes(self.snapshots)
    
    def get_distinguishing_attributes(self, snapshots):
        scores = {}
        for i in range(10):
            idx = random.randint(0, len(snapshots) - 1)
            
            snapshot = snapshots[idx]
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            locals_id = fun_call["locals"]
            
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            
            attrs = {}
            
            # if fun_call["parent_id"]:
            #     parent_call = self.cache.get_fun_call(fun_call["parent_id"])
            #     parent_fun_code = self.cache.get_fun_code(parent_call["fun_code_id"])
            #     parent_code_file = self.cache.get_code_file(parent_fun_code["code_file_id"])
            #     code_filename = get_filename(parent_code_file)
            #     attrs["context"] = "%s(…):%s" % (parent_fun_code["name"], code_filename)
            
            vars_values = self.value_fetcher.get_values_by_varnames(locals_id, self.vars, snapshot["id"])
            
            attrs["variables"] = {}
            
            for var_value in vars_values:
                attrs["variables"][var_value["key"]] = self.value_fetcher.fetch_value(var_value["value"], snapshot["id"], 2)
            score_attribute_uniqueness(attrs, scores, "")

        score_items = list(scores.items())
        score_items.sort(key=lambda item: len(item[1]), reverse=True)
        attributes_to_use = list(map(lambda pair: pair[0], score_items[0:3]))
        return attributes_to_use
        
    def layout(self, constraints):
        width = 80
        height = len(self.snapshots)
        width = constraints.constrain_width(width)
        height = constraints.constrain_height(height)
        self.size = (width, height)
    
    def paint(self):
        width, height = self.size
        xoffset = self.region.offset[0] - self.region.origin[0]
        yoffset = self.region.offset[1] - self.region.origin[1]
        snapshots = self.snapshots[yoffset:yoffset + height]
        for i, snapshot in enumerate(snapshots):
            line_display = sstring("%d: " % snapshot["id"])
            
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
            locals_id = fun_call["locals"]
            
            var_values = self.value_fetcher.get_values_by_varnames(locals_id, self.vars, snapshot["id"])
            
            attrs = {}
            for var_value in var_values:
                attrs[var_value["key"]] = self.value_fetcher.fetch_value(var_value["value"], snapshot["id"], 2)
            selected_attrs = {}
            for key in self.attrs_to_use:
                key_parts = key.split(".")[2:]
                curr_attrs = attrs
                for part in key_parts:
                    if curr_attrs and part in curr_attrs:
                        curr_attrs = curr_attrs[part]
                    else:
                        curr_attrs = None
                selected_attrs[key] = curr_attrs
            
            display_grouped = group_attributes(selected_attrs)
            
            for key, value in display_grouped.items():
                line_display += self.display_value(key, value)
            
            if self.current_snapshot_id == snapshot["id"]:
                line_display = sstring(line_display.ljust(width), [REVERSED])
            self.region.draw(-xoffset, yoffset + i, line_display)
            
    def display_value(self, key, value):
         if isinstance(value, dict):
             return sstring("%s = " % key) + sstring(self.display_dict(value), [YELLOW])
         else:
             return sstring("%s = " % key) + sstring(value, [YELLOW])

    def display_dict(self, a_dict):
        retval = "{"
        if "__class__" in a_dict:
            type_name = a_dict["__class__"]
            retval = "<%s>{" % type_name
        num_items = len(a_dict)
        for i, (key, value) in enumerate(a_dict.items()):
            if key == "__class__":
                continue
            retval += "%s: %r" % (key, value)
            retval += ", "
        retval += "…}"
        return retval
    
    def on_click(self, evt):
        yoffset = self.region.offset[1] - self.region.origin[1]
        x, y = self.region.relative_pos(evt.x, evt.y)
        i = yoffset + y
        hit = self.snapshots[i]
        fire_event(self, Event("goto_snapshot", snapshot_id=hit["id"]), bubble=True)
        
    def set_current_snapshot_id(self, snapshot_id):
        self.current_snapshot_id = snapshot_id
    
    def on_keypress(self, evt):
        if evt.key == "UP_ARROW":
            # optimization: can use binary search
            for hit in reversed(self.snapshots):
                if hit["id"] < self.current_snapshot_id:
                    fire_event(self, Event("goto_snapshot", snapshot_id=hit["id"]), bubble=True)
                    break
        elif evt.key == "DOWN_ARROW":
            for hit in self.snapshots:
                if hit["id"] > self.current_snapshot_id:
                    fire_event(self, Event("goto_snapshot", snapshot_id=hit["id"]), bubble=True)
                    break
    
    def want_focus(self):
        return True
        
keywords = set([
    "False", "await", "else", "import", "pass", "None",
    "break", "except", "in", "raise", "True", "class",
    "finally", "is", "return", "and", "continue", "for",
    "lambda", "try", "as", "def", "from", "nonlocal",
    "while", "assert", "del", "global", "not", "with",
    "async", "elif", "if", "or", "yield"
])
def find_vars(source):
    results = []
    i = 0
    while i < len(source):
        char = source[i]
        if char == '"' or char == "'":
            # read string literal
            quote = char
            i += 1
            while i < len(source):
                char = source[i]
                i += 1
                if char == quote:
                    break
        elif char.isalpha() or char == "_":
            path = char
            # read
            i += 1
            while i < len(source):
                char = source[i]
                i += 1
                if char.isalpha() or char in "_.":
                    path += char
                else:
                    break
            if path not in keywords:
                results.append(path.split("."))
        else:
            i += 1
    return results
    
def score_attribute_uniqueness(value, unique_values, path):
    if isinstance(value, dict):
        for key, child_value in value.items():
            score_attribute_uniqueness(child_value, unique_values, path + "." + key)
    else:
        # reached the leaf of the tree
        if path not in unique_values:
            unique_values[path] = set()
        unique_values[path].add(value)

class ValueFetcher:
    def __init__(self, cursor, value_cache):
        self.cursor = cursor
        self.value_cache = value_cache
        self.fetch_types()
        
    def fetch_types(self):
        self.type_dict = {}
        results = self.cursor.execute("select * from Type")
        for a_type in results:
            self.type_dict[a_type["id"]] = a_type["name"]
    
    def get_type_name(self, type_id):
        return self.type_dict[type_id]

    def get_values_by_varnames(self, dict_id, varnames, version):
        value_ids_dict = self.get_value_ids_by_varnames(dict_id, varnames, version)
        values = self.get_values(value_ids_dict.values(), version)
        retval = []
        for key, value_id in value_ids_dict.items():
            retval.append({ "key": key, "value": values[value_id] })
        return retval
    
    def get_value_ids_by_varnames(self, dict_id, varnames, version):
        sql = """
            select
            	Value.value as key, 
                Member.value as value_id
            from Member
            inner join Value on Member.key == Value.id
            where Member.container = ?
            and Value.version <= ?
            and Value.value in (%s)
        """ % ", ".join(map(repr, varnames))
        results = self.cursor.execute(sql, (dict_id, version)).fetchall()
        value_dict = {}
        for result in results:
            value_dict[result["key"]] = result["value_id"]
        return value_dict
        
    def get_values(self, value_ids, version):
        values_sql = """
        select 
        	Value.*
        from
        	Value,
            (
                select 
            		id,
            		max(version) as version
            	from Value
            	where
            		version <= ?
                    and id in (%s)
            	group by id
            ) as Versions
        where
            Value.id = Versions.id and
            Value.version = Versions.version
        """ % ",".join(map(lambda v: "?", value_ids))
        results = self.cursor.execute(values_sql, (version, *value_ids)).fetchall()
        values_dict = {}
        for result in results:
            values_dict[result["id"]] = result
        return values_dict
        
    def fetch_value(self, value, version, depth):
        type_name = self.get_type_name(value["type"])
        if type_name == "int":
            return int(value["value"])
        elif type_name == "float":
            return float(value["value"])
        elif type_name == "str":
            return value["value"]
        elif type_name == "bool":
            return value["value"] == "1"
        elif type_name == "list":
            return MysteryValue("[…]")
        elif type_name == "tuple":
            return MysteryValue("(…)")
        elif type_name == "set":
            return MysteryValue("set(…)")
        elif type_name == "dict":
            return self.fetch_dict(value["id"], version, depth - 1)
        elif type_name == "none":
            return None
        elif type_name == "<ref>":
            real_value = self.value_cache.get_value(value["value"], version)
            return self.fetch_value(real_value, version, depth)
        elif type_name == "object":
            return self.fetch_object(value, version, depth - 1)
        else:
            return UnknownValue()
    
    def fetch_object(self, value, version, depth):
        if depth <= 0:
            return MysteryValue("…")
        data = value["value"].split(" ")
        if len(data) == 1:
            type_id = data[0]
            dict_id = None
        elif len(data) == 2:
            type_id, dict_id = data
        else:
            raise Exception("Object value has more than 2 values %r" % data)
        
        type_value = self.value_cache.get_value(type_id, version)
        values = self.fetch_dict(dict_id, version, depth)
        values["__class__"] = type_value["value"]
        return values
    
    def fetch_dict(self, dict_id, version, depth):
        if depth <= 0:
            return MysteryValue("{…}")
        
        members = self.cursor.execute("select * from Member where container = ?", (dict_id,)).fetchall()
        value_ids = []
        for member in members:
            value_ids.append(member["key"])
            value_ids.append(member["value"])
        
        values_sql = """
        select 
        	Value.*,
            Type.name as type_name
        from
        	Value,
            (
                select 
            		id,
            		max(version) as version
            	from Value
            	where
            		version <= ?
                    and id in (%s)
            	group by id
            ) as Versions,
            Type
        where
            Value.id = Versions.id and 
            Value.type = Type.id and
            Value.version = Versions.version
        """ % ",".join(map(str, value_ids))
        values = self.cursor.execute(values_sql, (version,)).fetchall()
        # print("values", values)
        value_dict = {}
        for value in values:
            value_display = self.fetch_value(value, version, depth)
            value_dict[value["id"]] = value_display
        
        the_dict = {}
        for member in members:
            key_id = member["key"]
            if key_id not in value_dict:
                continue
            key_key = value_dict[key_id]
            if member["value"] in value_dict:
                value = value_dict[member["value"]]
                the_dict[key_key] = value
        return the_dict

class MysteryValue:
    def __init__(self, display):
        self.display = display
    
    def __repr__(self):
        return self.display

    def __hash__(self):
        return hash(self.display)
    
    def __eq__(self, other):
        return isinstance(other, MysteryValue) and self.display == other.display

class UnknownValue:
    def __repr__(self):
        return "Unknown"
    
    def __hash__(self):
        return 1
    
    def __eq__(self, other):
        return isinstance(other, UnknownValue)