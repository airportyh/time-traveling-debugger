import sqlite3

# https://docs.python.org/3/library/sqlite3.html
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class CodeSeer:
    def __init__(self, filename):
        self.filename = filename
        self.fun_call_level_map = {}
    
    def connect(self):
        self.conn = sqlite3.connect(self.filename)
        self.conn.row_factory = dict_factory
        self.cursor = self.conn.cursor()
    
    def key_by_id(self, records):
        retval = {}
        for item in records:
            retval[item["id"]] = item
        return retval
    
    def fetch_codes(self):
        self.fun_calls = self.key_by_id(self.cursor.execute("select * from FunCall"))
        self.fun_codes = self.key_by_id(self.cursor.execute("select * from FunCode"))
        self.code_files = self.key_by_id(self.cursor.execute("select * from CodeFile"))
    
    def fetch_snapshots(self):
        self.snapshots = list(self.cursor.execute("select * from Snapshot"))
    
    def get_source(self, fun_call_id, line_no):
        fun_call = self.fun_calls[fun_call_id]
        fun_code = self.fun_codes[fun_call["fun_code_id"]]
        code_file = self.code_files[fun_code["code_file_id"]]
        if code_file["source"] is None:
            return "<unavailable>"
        line = code_file["source"].split("\n")[line_no - 1]
        return line
    
    def get_fun_call_level(self, fun_call_id):
        if fun_call_id in self.fun_call_level_map:
            return self.fun_call_level_map[fun_call_id]
        fun_call = self.fun_calls[fun_call_id]
        if fun_call["parent_id"] == None:
            retval = 0
        else:
            retval = 1 + self.get_fun_call_level(fun_call["parent_id"])
        self.fun_call_level_map[fun_call_id] = retval
        return retval
    
    def get_dict(self, id, version):
        members_sql = """
        select * from Member
        """
        # TODO: make sure value is latest one
        members = list(self.cursor.execute(members_sql))
        ids = []
        for member in members:
            ids.append(member['key'])
            ids.append(member['value'])
        
        
        values_sql = """
        select 
        	Value.*
        from
        	Value,
            (select 
        		id,
        		max(version) as version
        	from Value
        	where
        		version <= ?
                and id in (%s)
        	group by id) as Versions
        where
            Value.id = Versions.id and 
            Value.version = Versions.version
        """ % ",".join(map(str, ids))
        
        values = self.cursor.execute(values_sql, (version,))
        values_dict = {}
        for value in values:
            values_dict[value['id']] = value['value']
        
        retval = {}
        print("values_dict", values_dict)
        print("members", members)
        for member in members:
            retval[values_dict[member['key']]] = values_dict[member['value']]
        return retval
    
    def display_code(self):
        for i, snapshot in enumerate(self.snapshots):
            # if snapshot["start_fun_call_id"] == 0:
            #     continue
            
            line = self.get_source(snapshot["fun_call_id"], snapshot["line_no"]).lstrip()
            last_level = i > 0 and self.get_fun_call_level(self.snapshots[i - 1]["fun_call_id"]) or 0
            next_level = i + 1 < len(self.snapshots) and self.get_fun_call_level(self.snapshots[i + 1]["fun_call_id"]) or 0
            level = self.get_fun_call_level(snapshot["fun_call_id"])
            # print(i, level, last_level, next_level)
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
                
            # line_no = str(snapshot["id"]).ljust(8)
            print("%s%s" % (prefix, line))  
            
            # if snapshot["start_fun_call_id"] != None:
            #     fun_call = self.fun_calls[snapshot["start_fun_call_id"]]
            #     fun_code = self.fun_codes[fun_call["fun_code_id"]]
            #     # locals = self.get_dict(fun_call["locals"], snapshot["id"] + 1)
            #     params = ", ".join(
            #         map(lambda k: "%s=%r" % (k, locals[k]), 
            #         filter(lambda k: locals[k] is not None, locals.keys())))
            #     indent = "    " + " ┃  " * (level)
            #     print("%s%s" % (indent, color("%s(%s)" % (fun_code["name"], params), 33)))

def color(string, code):
    return "\u001b[%dm%s\u001b[0m" % (code, string)