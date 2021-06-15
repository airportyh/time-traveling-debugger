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