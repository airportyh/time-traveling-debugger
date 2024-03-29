from lru_cache.cache import LruCache

class ObjectCache:
    def __init__(self, conn, cursor):
        self.cache = LruCache(1000)
        self.conn = conn
        self.cursor = cursor
    
    def put_snapshot(self, snapshot):
        key = "Snapshot/%d" % snapshot["id"]
        self.cache[key] = snapshot
        
    def get_snapshot(self, id):
        key = "Snapshot/%d" % id
        if key in self.cache:
            return self.cache[key]
        else:
            snapshot = self.cursor.execute("select * from Snapshot where id = ?", (id,)).fetchone()
            self.cache[key] = snapshot
            return snapshot
            
    def get_fun_call(self, id):
        key = "FunCall/%d" % id
        if key in self.cache:
            return self.cache[key]
        else:
            fun_call = self.cursor.execute("select * from FunCall where id = ?", (id,)).fetchone()
            self.cache[key] = fun_call
            return fun_call
    
    def get_fun_code(self, id):
        key = "FunCode/%d" % id
        if key in self.cache:
            return self.cache[key]
        else:
            fun = self.cursor.execute("select * from FunCode where id = ?", (id,)).fetchone()
            self.cache[key] = fun
            return fun
    
    def get_code_file(self, id):
        key = "CodeFile/%d" % id
        if key in self.cache:
            return self.cache[key]
        code_file = self.cursor.execute("select * from CodeFile where id = ?", (id,)).fetchone()
        self.cache[key] = code_file
        return code_file
    
    def get_code_lines(self, code_file_id):
        key = "CodeFile/%d/code_lines" % code_file_id
        if key in self.cache:
            return self.cache[key]
        code_file = self.get_code_file(code_file_id)
        code_lines = code_file["source"].split("\n") if code_file["source"] else [""]
        self.cache[key] = code_lines
        return code_lines
    
    def get_code_file_lines_hit(self, code_file_id):
        key = "CodeFile/%d/lines_hit" % code_file_id
        if key in self.cache:
            return self.cache[key]
        sql = """
            select 
            	distinct Snapshot.line_no
            from Snapshot
            inner join FunCall
            	on Snapshot.fun_call_id = FunCall.id
            inner join FunCode
            	on FunCall.fun_code_id = FunCode.id
            where
            	FunCode.code_file_id = ?
        """
        results = self.cursor.execute(sql, (code_file_id,)).fetchall()
        line_nos = set()
        for result in results:
            line_nos.add(result["line_no"])
        self.cache[key] = line_nos
        return line_nos

    def get_members(self, container_id):
        key = "Member/%d" % container_id
        if key in self.cache:
            return self.cache[key]
        members = self.cursor.execute("select * from Member where container = ? order by key", (container_id,)).fetchall()
        self.cache[key] = members
        return members
        
    def get_error_by_snapshot(self, snapshot_id):
        key = "Error/snapshot/%d" % snapshot_id
        if key in self.cache:
            return self.cache[key]
        error = self.cursor.execute("select * from Error where snapshot_id = ?", (snapshot_id,)).fetchone()
        self.cache[key] = error
        return error
        
    def get_code_files_lite(self):
        key = "CodeFiles/lite"
        if key in self.cache:
            return self.cache[key]
        sql = """
            select id, file_path from CodeFile
        """
        result = self.cursor.execute(sql).fetchall()
        self.cache[key] = result
        return result
        
    def get_fun_codes_lite(self):
        key = "FunCodes/lite"
        if key in self.cache:
            return self.cache[key]
        sql = """
            select id, name, code_file_id from FunCode
        """
        result = self.cursor.execute(sql).fetchall()
        self.cache[key] = result
        return result