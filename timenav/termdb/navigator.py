import sqlite3
import time
from .object_cache import ObjectCache

log_file = open("navigator.log", "w")

def log(message):
    log_file.write(message)
    log_file.write("\n")
    log_file.flush()

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
        log("step_over")
        
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
        start = time.time()
        result = self.cursor.execute(step1, params1).fetchone()
        end = time.time()
        log("step1 query took %f seconds" % (end - start))

        step2 = """
            select *
            from Snapshot
            where id > ?
                and fun_call_id = ?
            order by id desc limit 1
        """
        params2 = (snapshot["id"], snapshot["fun_call_id"])
        start = time.time()
        last = self.cursor.execute(step2, params2).fetchone()
        end = time.time()
        # log("step2 query took %f seconds" % (end - start))
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
            start = time.time()
            result = self.cursor.execute(step3, params3).fetchone()
            end = time.time()
            log("step3 query took %f seconds" % (end - start))
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
    
    def get_first_error(self):
        error = self.cursor.execute("select * from Error limit 1").fetchone()
        return error
    
    def get_all_errors(self):
        return self.cursor.execute("select * from Error").fetchall()
    
    def get_snapshot_by_start_fun_call(self, id):
        return self.cursor.execute("select * from Snapshot where start_fun_call_id = ?", (id,)).fetchone()
        
    def fast_forward(self, code_file_id, line_no, snapshot_id):
        sql = """
            select Snapshot.*
            from Snapshot 
            inner join FunCall on (Snapshot.fun_call_id = FunCall.id)
            inner join FunCode on (FunCall.fun_code_id = FunCode.id)
            where FunCode.code_file_id = ?
                and Snapshot.line_no = ?
                and Snapshot.id > ?
            order by id
            limit 1
        """
        return self.cursor.execute(sql, (code_file_id, line_no, snapshot_id)).fetchone()
    
    def rewind(self, code_file_id, line_no, snapshot_id):
        sql = """
            select Snapshot.*
            from Snapshot 
            inner join FunCall on (Snapshot.fun_call_id = FunCall.id)
            inner join FunCode on (FunCall.fun_code_id = FunCode.id)
            where FunCode.code_file_id = ?
                and Snapshot.line_no = ?
                and Snapshot.id < ?
            order by id desc
            limit 1
        """
        return self.cursor.execute(sql, (code_file_id, line_no, snapshot_id)).fetchone()
    
    def get_print_output_up_to(self, snapshot_id):
        sql = "select * from PrintOutput where snapshot_id <= ?"
        return self.cursor.execute(sql, (snapshot_id,)).fetchall()
    
    def get_child_fun_calls(self, fun_call_id):
        sql = """
            select *
            from FunCall
            where parent_id = ?
        """
        return self.cursor.execute(sql, (fun_call_id,)).fetchall()
    
    def get_first_and_last_snapshots_for_fun_call(self, fun_call_id):
        sql = """
            select min(id) as first_id, max(id) as last_id
            from Snapshot
            where fun_call_id = ?
        """
        result = self.cursor.execute(sql, (fun_call_id, )).fetchone()
        return result
    
    def get_code_files_lite(self):
        sql = """
            select id, file_path from CodeFile
        """
        return self.cursor.execute(sql).fetchall()
	