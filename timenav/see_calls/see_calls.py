import sqlite3
from termdb.navigator import Navigator
from termdb.object_cache import ObjectCache
from termdb.value_cache import ValueCache

class SeeCalls:
    def __init__(self, hist_filename, start_snapshot_id=None):
        self.hist_filename = hist_filename
        self.start_snapshot_id = start_snapshot_id or 1
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.value_cache = ValueCache(self.conn, self.cursor)
        self.nav = Navigator(self.conn, self.cursor, self.cache)
    
    def init_db(self):
        # https://docs.python.org/3/library/sqlite3.html
        def dict_factory(cursor, row):
            d = {}
            for idx, col in enumerate(cursor.description):
                d[col[0]] = row[idx]
            return d

        self.conn = sqlite3.connect(self.hist_filename)
        self.conn.row_factory = dict_factory
        self.cursor = self.conn.cursor()
    
    def display_calls(self):
        fun_call = self.cache.get_fun_call(self.start_snapshot_id)
        self.display_call(fun_call, 0)
    
    def get_dict(self, locals_id, version):
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
        # print("values", values)
        value_dict = {}
        for value in values:
            value_display = self.display_value(value, version)
            value_dict[value["id"]] = value_display
        
        the_dict = {}
        for member in members:
            key_key = value_dict[member["key"]]
            if member["value"] in value_dict:
                value = value_dict[member["value"]]
                the_dict[key_key] = value
        return the_dict
    
    def display_value(self, value, version):
        type_name = value["type_name"]
        value_value = None
        if type_name == "int":
            value_value = int(value["value"])
        elif type_name == "float":
            value_value = float(value["value"])
        elif type_name == "str":
            value_value = str(value["value"])
        elif type_name == "bool":
            value_value = value["value"] == "1"
        elif type_name == "list":
            value_value = "[…]"
        elif type_name == "tuple":
            value_value = "(…)"
        elif type_name == "set":
            value_value = "set(…)"
        elif type_name == "dict":
            value_value = "{…}"
        elif type_name == "none":
            value_value = None
        elif type_name == "<ref>":
            real_value = self.value_cache.get_value(value["value"], version)
            return self.display_value(real_value, version)
        else:
            if type_name == "object":
                value_value = "…"
            else:
                value_value = "%s(…)" % type_name
        
        return value_value
    
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