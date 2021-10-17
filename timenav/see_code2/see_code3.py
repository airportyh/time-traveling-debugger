# Todo
# sampling to find most distinguishing attributes
# Apply this to see_calls
# allow passing in local vars as a parameter, not just from parsing source

# fix getting multiple values for each variable because not limiting to the top one (done)

import sqlite3
from termdb.navigator import Navigator
from termdb.object_cache import ObjectCache
from termdb.value_cache import ValueCache
from termdb.code_file import get_filename
from sstring import *
import ast
from .group_attributes import *
import random

# https://docs.python.org/3/library/sqlite3.html
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class SeeCode3:
    def __init__(self, filename, fun_code_id):
        self.filename = filename
        self.fun_code_id = fun_code_id
        self.connect()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.value_cache = ValueCache(self.conn, self.cursor)
        self.nav = Navigator(self.conn, self.cursor, self.cache)
        self.fetch_types()
    
    def connect(self):
        self.conn = sqlite3.connect(self.filename)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
    def fetch_types(self):
        self.type_dict = {}
        results = self.cursor.execute("select * from Type")
        for a_type in results:
            self.type_dict[a_type["id"]] = a_type["name"]
    
    def get_type_name(self, type_id):
        return self.type_dict[type_id]
    
    def run(self):
        fun_code = self.cache.get_fun_code(self.fun_code_id)
        num_args = fun_code["num_args"]
        args = fun_code["local_varnames"].split(",")[:num_args]
        
        print("Function name: %s" % fun_code["name"])
        
        snapshots = self.nav.get_fun_call_starts(self.fun_code_id)
        
        if len(snapshots) == 0:
            print("No snapshots found")
            return
        
        attrs_to_use = self.get_distinguishing_attributes(snapshots, args)
        print("attrs_to_use", attrs_to_use)
        
        for snapshot in snapshots:
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
            code_file = self.cache.get_code_file(fun_code["code_file_id"])
            code_lines = self.cache.get_code_lines(fun_code["code_file_id"])
            line_no = snapshot["line_no"]
            line = code_lines[line_no - 1].strip()
            
            
            print("%d - %s: %s" % (snapshot["id"], get_filename(code_file), line))
            next_snapshot = snapshot = self.cache.get_snapshot(snapshot["id"] + 1)
            fun_call = self.cache.get_fun_call(next_snapshot["fun_call_id"])
            locals_id = fun_call["locals"]
            attrs = {}
            vars_values = self.get_vars_values(locals_id, next_snapshot["id"], args)
            
            for var_value in vars_values:
                # display = self.display_value(var_value["value"], snapshot["id"], 1)
                # print("%s = %s" % (var_value["key"], display))
                attrs[var_value["key"]] = self.fetch_value(var_value["value"], next_snapshot["id"], 2)
            
            # print("attrs", attrs)
            selected_attrs = {}
            for key in attrs_to_use:
                key_parts = key.split(".")[1:]
                curr_attrs = attrs
                for part in key_parts:
                    if curr_attrs and part in curr_attrs:
                        curr_attrs = curr_attrs[part]
                    else:
                        curr_attrs = None
                selected_attrs[key] = curr_attrs
            
            # print("selected_attrs", selected_attrs)
            
            display_grouped = group_attributes(selected_attrs)
            # print("display_grouped", display_grouped)
            
            def print_variables(grouped):
                for key, value in grouped.items():
                    # print("key", key)
                    if isinstance(value, dict):
                        print("%s = %s" % (key, sstring(display_dict(value), [YELLOW])), end=" ")
                    else:
                        print("%s = %r" % (key, sstring(value, [YELLOW])), end=" ")
        
            def display_dict(a_dict):
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
            print("  ", end="")
            print_variables(display_grouped)
            
            print()
                
    def get_distinguishing_attributes(self, snapshots, vars):
        # print("get_distinguishing_attributes")
        scores = {}
        for i in range(10):
            idx = random.randint(0, len(snapshots) - 1)
            
            snapshot = snapshots[idx]
            snapshot = self.cache.get_snapshot(snapshot["id"] + 1)
            # print("idx: %d, snapshot: %d" % (idx, snapshot["id"]))
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            locals_id = fun_call["locals"]
            
            # locals = self.get_dict(locals_id, snapshot["id"])
            # print("Step %d:" % snapshot["id"])
            
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            
            attrs = {}
    
                # print("Parent fun call: %d: %s: %s" % (fun_call["parent_id"], parent_fun_code["name"], code_filename))
            
            vars_values = self.get_vars_values(locals_id, snapshot["id"], vars)
            
            # print("vars_values", vars_values)
            for var_value in vars_values:
                # display = self.display_value(var_value["value"], snapshot["id"], 1)
                # print("%s = %s" % (var_value["key"], display))
                attrs[var_value["key"]] = self.fetch_value(var_value["value"], snapshot["id"], 2)
            score_attribute_uniqueness(attrs, scores, "")
            

        score_items = list(scores.items())
        score_items.sort(key=lambda item: len(item[1]), reverse=True)
        attributes_to_use = list(map(lambda pair: pair[0], score_items[0:3]))
        return attributes_to_use
    
    def get_vars_value_ids(self, container_id, version, vars):
        sql = """
            select
            	Value.value as key, 
                Member.value as value_id
            from Member
            inner join Value on Member.key == Value.id
            where Member.container = ?
            and Value.version <= ?
            and Value.value in (%s)
        """ % ", ".join(map(repr, vars))
        results = self.cursor.execute(sql, (container_id, version)).fetchall()
        value_dict = {}
        for result in results:
            value_dict[result["key"]] = result["value_id"]
        return value_dict
    
    def get_vars_values(self, container_id, version, vars):
        value_ids_dict = self.get_vars_value_ids(container_id, version, vars)
        values = self.get_values(value_ids_dict.values(), version)
        retval = []
        for key, value_id in value_ids_dict.items():
            retval.append({ "key": key, "value": values[value_id] })
        return retval
            
    def get_dict(self, locals_id, version, depth):
        members = self.cursor.execute("select * from Member where container = ?", (locals_id,)).fetchall()
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
        value_dict = {}
        for value in values:
            value_display = self.display_value(value, version, depth)
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

    def display_value(self, value, version, depth):
        type_name = self.get_type_name(value["type"])
        value_value = None
        if type_name == "int":
            value_value = int(value["value"])
        elif type_name == "float":
            value_value = float(value["value"])
        elif type_name == "str":
            value_value = repr(value["value"])
        elif type_name == "bool":
            value_value = value["value"] == "1"
        elif type_name == "list":
            value_value = "[…]"
        elif type_name == "tuple":
            value_value = self.display_tuple(value, version, depth - 1)
        elif type_name == "set":
            value_value = "set(…)"
        elif type_name == "dict":
            value_value = "{…}"
        elif type_name == "none":
            value_value = None
        elif type_name == "<ref>":
            real_value = self.value_cache.get_value(value["value"], version)
            return self.display_value(real_value, version, depth)
        elif type_name == "object":
            if depth >= 1:
                value_value = self.display_object(value, version, depth - 1)
            else:
                value_value = "(…)"
        
        return value_value
    
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
    
    def display_dict(self, dict_id, version, depth):
        dict_values = self.get_dict(dict_id, version, depth)
        def display_pair(pair):
            key, value = pair
            return "%s = %s" % (key, value)
        return "{ " + ", ".join(map(display_pair, dict_values.items())) + " }"
        
    def display_object(self, value, version, depth):
        data = value["value"].split(" ")
        if len(data) == 1:
            type_id = data[0]
            dict_id = None
        elif len(data) == 2:
            type_id, dict_id = data
        else:
            raise Exception("Object value has more than 2 values %r" % data)
        
        type_value = self.value_cache.get_value(type_id, version)
        dict_display = self.display_dict(dict_id, version, depth)
        return "<%s>(%s)" % (type_value["value"], dict_display)

    def display_call(self, fun_call, level):
        indent = "  " * level
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        param_list = self.get_param_list(fun_code)
        # print("%sparam_list %r" % (indent, list(param_list)))
        varnames = fun_code["local_varnames"].split(",") if fun_code["local_varnames"] else []
        result = self.nav.get_first_and_last_snapshots_for_fun_call(fun_call["id"])
        first_locals_dict = self.get_dict(fun_call["locals"], result["first_id"])
        last_locals_dict = self.get_dict(fun_call["locals"], result["last_id"])
        params = {}
        for param in param_list:
            # if param == "self":
            #     continue
            # if param in first_locals_dict:
            params[param] = first_locals_dict[param]
        # params_display = ""
        params_display = ", ".join([
            "%s=%s" % (key, value)
            for key, value in params.items()
        ])
        ret_val = None
        if "<ret val>" in last_locals_dict:
            ret_val = last_locals_dict["<ret val>"]
        print("%s%s(%s) => %s" % (indent, fun_code["name"], params_display, ret_val))
        
        child_calls = self.nav.get_child_fun_calls(fun_call["id"])
        for child_call in child_calls:
            self.display_call(child_call, level + 1)

    def get_param_list(self, fun_code):
        if fun_code["local_varnames"] is None:
            return []
        vars = fun_code["local_varnames"].split(",")
        return vars[0:fun_code["num_args"]]

    def display_tuple(self, value, version, depth):
        if depth <= 0:
            return MysteryValue("(…)")
        display_values = []
        members = self.cache.get_members(value["id"])
        for member in members:
            idx = member["key"]
            value_id = member["value"]
            value = self.value_cache.get_value(value_id, version)
            if value is None or value["type_name"] == "<deleted>":
                continue
            
            value_display = self.display_value(value, version, depth)
            display_values.append(value_display)
        
        return "(%s)" % ", ".join(map(repr, display_values))
        
        
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
        
def score_attribute_uniqueness(value, unique_values, path):
    if isinstance(value, dict):
        for key, child_value in value.items():
            score_attribute_uniqueness(child_value, unique_values, path + "." + key)
    else:
        # reached the leaf of the tree
        if path not in unique_values:
            unique_values[path] = set()
        unique_values[path].add(value)
    
        
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Please provide a .sqlite file, and a code number.")
        exit(1)
    filename = sys.argv[1]
    fun_code_id = int(sys.argv[2])

    if not filename.endswith(".sqlite"):
        print("Please provide a .sqlite file.")
    else:
        see_code = SeeCode3(filename, fun_code_id)
        see_code.run()

