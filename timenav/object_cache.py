from lru_cache.cache import LruCache

class ObjectCache:
    def __init__(self, conn, cursor):
        self.cache = LruCache(1000)
        self.conn = conn
        self.cursor = cursor
    
    def get_value(self, id, version):
        key = "Value/%d/%d" % (id, version)
        if key in self.cache:
            return self.cache[key]
        sql = """
        select Value.*, Type.name as type_name
        from Value
            inner join Type on Value.type = Type.id
        where Value.id = ?
            and version <= ?
        order by version desc
        limit 1
        """
        value = self.cursor.execute(sql, (id, version)).fetchone()
        self.cache[key] = value
        return value
    
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
        members = self.cursor.execute("select * from Member where container = ?", (container_id,)).fetchall()
        self.cache[key] = members
        return members