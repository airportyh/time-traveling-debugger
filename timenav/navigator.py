import sqlite3
from object_cache import ObjectCache

class Navigator:
    def __init__(self, conn, cursor, cache, verbose=False):
        self.conn = conn
        self.cursor = cursor
        self.cache = cache
        self.verbose = verbose

    def get_last_snapshot(self):
        snapshot = self.cursor.execute("select * from Snapshot order by id desc limit 1").fetchone()
        self.cache.put_snapshot(snapshot)
        return snapshot

    def step_over(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        step1 = """
            select *
            from Snapshot
            where id > ? 
                and (
                    (fun_call_id = ? and line_no != ?) 
                    or (fun_call_id == ?)
                )
            order by id limit 1
        """
        params1 = (snapshot["id"], fun_call["id"], snapshot["line_no"], fun_call["parent_id"])
        result = self.cursor.execute(step1, params1).fetchone()
        if self.verbose:
            print(step1, params1)
            print("Result:", result)
        step2 = """
            select *
            from Snapshot
            where id > ?
                and fun_call_id = ?
            order by id desc limit 1
        """
        params2 = (snapshot["id"], snapshot["fun_call_id"])
        last = self.cursor.execute(step2, params2).fetchone()
        if self.verbose:
            print(step2, params2)
            print("Result:", last)
        if last and result and last["id"] < result["id"]:
            result = last
        if result is None:
            step3 = """
                select *
                from Snapshot
                where id > ?
                    and fun_call_id = ?
                order by id limit 1
            """
            params3 = (snapshot["id"], snapshot["fun_call_id"])
            result = self.cursor.execute(step3, params3).fetchone()
            if self.verbose:
                print(step3, params3)
                print("Result:", result)
        
        if result:
            self.cache.put_snapshot(result)
        return result
        
    def step_over_backward(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        result = None
        step1 = """
            select * from Snapshot
            where id < ?
                and (
                    (fun_call_id = ? and line_no != ?) or 
                    (fun_call_id == ?)
                )
            order by id desc limit 1
        """
        prev = self.cursor.execute(step1, (snapshot["id"], snapshot["fun_call_id"], snapshot["line_no"], fun_call["parent_id"])).fetchone()
        step2 = """
            select *
            from Snapshot
            where id < ?
                and fun_call_id = ?
            order by id limit 1
        """
        first = self.cursor.execute(step2, (snapshot["id"], snapshot["fun_call_id"])).fetchone()
        if prev:
            if first and first["id"] > prev["id"]:
                result = first
            else:
                if prev["fun_call_id"] == snapshot["fun_call_id"]:
                    prev_fun_call = self.cache.get_fun_call(prev["fun_call_id"])
                    prev_prev = self.cursor.execute(step1, (
                        prev["id"], 
                        prev["fun_call_id"], 
                        prev["line_no"], 
                        prev_fun_call["parent_id"]
                    )).fetchone()
                    if prev_prev:
                        if first and first["id"] > prev_prev["id"]:
                            result = first
                        else:
                            prev_prev_fun_call = self.cache.get_fun_call(prev_prev["fun_call_id"])
                            step3 = """
                                select *
                                from Snapshot
                                where id > ? 
                                    and (
                                        (fun_call_id = ? and line_no != ?) 
                                        or (fun_call_id == ?)
                                    )
                                order by id limit 1
                            """
                            result = self.cursor.execute(step3, (
                                prev_prev["id"],
                                prev_prev["fun_call_id"],
                                prev_prev["line_no"],
                                fun_call["parent_id"]
                            )).fetchone() or prev_prev
                    else:
                        result = prev
                else:
                    result = prev
        else:
            step4 = """
                select *
                from Snapshot
                where id < ?
                    and fun_call_id = ?
                order by id desc limit 1
            """
            result = self.cursor.execute(step4, (snapshot["id"], snapshot["fun_call_id"])).fetchone()
        return result

    def get_members(self, container_id):
        sql = "select * from Member where container = ?"
        result = self.cursor.execute(sql, (container_id, version)).fetchall()
        return result
    
    