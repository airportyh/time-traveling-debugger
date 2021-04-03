import termios
import sys
import tty
import os
from urllib import request
import json
from functools import reduce
import atexit
import sqlite3
from term_util import *
from text_pane import *
    
def display_source(file_lines, code_pane):
    gutter_width = len(str(len(file_lines) + 1))

    lines = []
    for i, line in enumerate(file_lines):
        line = line.replace("\t", "    ")
        lineno = i + 1
        lineno_display = str(i + 1).rjust(gutter_width) + ' '
        line_display = lineno_display + line
        lines.append(line_display)

    code_pane.set_lines(lines)

class ObjectCache:
    def __init__(self, conn, cursor):
        self.cache = {}
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
    
    def get_fun(self, id):
        key = "Fun/%d" % id
        if key in self.cache:
            return self.cache[key]
        else:
            fun = self.cursor.execute("select * from Fun where id = ?", (id,)).fetchone()
            self.cache[key] = fun
            return fun
    
    def get_code_file(self, id):
        key = "CodeFile/%d" % id
        if key in self.cache:
            return self.cache[key]
        else:
            code_file = self.cursor.execute("select * from CodeFile where id = ?", (id,)).fetchone()
            self.cache[key] = code_file
            return code_file

class TimeNav:
    def __init__(self, hist_filename):
        self.hist_filename = hist_filename
        termsize = os.get_terminal_size()
        code_pane_width = termsize.columns
        code_pane_height = termsize.lines - 1
        self.code_pane = TextPane(Box(1, 1, code_pane_width, code_pane_height))
        self.status_pane = TextPane(Box(1, termsize.lines, termsize.columns, 1))
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
    
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
    
    def save_term_settings(self):
        self.original_settings = termios.tcgetattr(sys.stdin)
    
    def restore_term_settings(self):
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, self.original_settings)
        print('\x1B[0m')
        
    def clean_up(self):
        self.restore_term_settings()
        mouse_off()
        mouse_motion_off()
    
    def run(self):
        self.save_term_settings()
        atexit.register(self.clean_up)
        tty.setraw(sys.stdin)
        clear_screen()
        
        snapshot = self.cache.get_snapshot(1)
        self.last_snapshot = self.cursor.execute("select * from Snapshot order by id desc limit 1").fetchone()
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun = self.cache.get_fun(fun_call["fun_id"])
        code_file = self.cache.get_code_file(fun["code_file_id"])
        
        lines = code_file["source"].split("\n")
        display_source(lines, self.code_pane)
        self.code_pane.set_highlight(snapshot["line_no"] - 1)
        self.scroll_to_line_if_needed(snapshot["line_no"], lines)
        self.update_status(snapshot)
        
        while True:
            inp = get_input()
            if inp == "q":
                break
            data = list(map(ord, inp))
            if data == RIGHT_ARROW:
                next = self.cache.get_snapshot(snapshot["id"] + 1)
            elif data == LEFT_ARROW:
                next = self.cache.get_snapshot(snapshot["id"] - 1)
            elif data == DOWN_ARROW:
                next = self.step_over(snapshot)
            elif data == UP_ARROW:
                next = self.step_over_backward(snapshot)
            else:
                continue

            if next:
                snapshot = next
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            fun = self.cache.get_fun(fun_call["fun_id"])
            code_file = self.cache.get_code_file(fun["code_file_id"])
            
            self.code_pane.set_highlight(snapshot["line_no"] - 1)
            self.scroll_to_line_if_needed(snapshot["line_no"], lines)
            
            self.update_status(snapshot)
            
    def update_status(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun = self.cache.get_fun(fun_call["fun_id"])
        message = "Step %d of %d: %s() line %d" % (
            snapshot["id"], 
            self.last_snapshot["id"],
            fun["name"],
            snapshot["line_no"]
        )
        termsize = os.get_terminal_size()
        message = message[0:termsize.columns].center(termsize.columns)
        self.status_pane.set_lines([message])
        self.status_pane.set_highlight(0)
    
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
        result = self.cursor.execute(step1, (snapshot["id"], fun_call["id"], snapshot["line_no"], fun_call["parent_id"])).fetchone()
        step2 = """
            select *
            from Snapshot
            where id > ?
                and fun_call_id = ?
            order by id desc limit 1
        """
        last = self.cursor.execute(step2, (snapshot["id"], snapshot["fun_call_id"])).fetchone()
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
            result = self.cursor.execute(step3, (snapshot["id"], snapshot["fun_call_id"])).fetchone()
        
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
            
    def scroll_to_line_if_needed(self, line, lines):
        offset = self.code_pane.top_offset
        box = self.code_pane.box
        if line > (offset + box.height - 1):
            offset = min(
                len(lines) - box.height,
                line - box.height // 2
            )
        if line < (offset + 1):
            offset = max(0, line - box.height // 2)
        self.code_pane.scroll_top_to(offset)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide a history file.")
    else:
        timenav = TimeNav(sys.argv[1])
        try:
            timenav.run()
        except Exception as e:
            timenav.clean_up()
            raise e