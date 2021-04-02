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

class TimeNav(object):
    def __init__(self, hist_filename):
        self.hist_filename = hist_filename
        termsize = os.get_terminal_size()
        code_pane_width = termsize.columns
        code_pane_height = termsize.lines - 1
        self.code_pane = TextPane(Box(1, 1, code_pane_width, code_pane_height))
        self.status_pane = TextPane(Box(1, termsize.lines, termsize.columns, 1))
    
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
        object_cache = {}
        clear_screen()
        tty.setraw(sys.stdin)
        clear_screen()
        
        conn = sqlite3.connect(self.hist_filename)
        conn.row_factory = dict_factory
        cursor = conn.cursor()
        
        snapshot = cursor.execute("select * from Snapshot where id = 1").fetchone()
        fun_call = cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
        fun = cursor.execute("select * from Fun where id = ?", (fun_call["fun_id"],)).fetchone()
        code_file = cursor.execute("select * from CodeFile where id = ?", (fun["code_file_id"],)).fetchone()
        
        lines = code_file["source"].split("\n")
        display_source(lines, self.code_pane)
        self.code_pane.set_highlight(snapshot["line_no"] - 1)
        
        self.scroll_to_line_if_needed(snapshot["line_no"], lines)
        
        while True:
            inp = get_input()
            if inp == "q":
                break
            data = list(map(ord, inp))
            if data == DOWN_ARROW:
                snapshot = cursor.execute("select * from Snapshot where id = ?", (snapshot["id"] + 1,)).fetchone()
                fun_call = cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
                fun = cursor.execute("select * from Fun where id = ?", (fun_call["fun_id"],)).fetchone()
                code_file = cursor.execute("select * from CodeFile where id = ?", (fun["code_file_id"],)).fetchone()
            elif data == UP_ARROW:
                snapshot = cursor.execute("select * from Snapshot where id = ?", (snapshot["id"] - 1,)).fetchone()
                fun_call = cursor.execute("select * from FunCall where id = ?", (snapshot["fun_call_id"],)).fetchone()
                fun = cursor.execute("select * from Fun where id = ?", (fun_call["fun_id"],)).fetchone()
                code_file = cursor.execute("select * from CodeFile where id = ?", (fun["code_file_id"],)).fetchone()
            
            
            self.code_pane.set_highlight(snapshot["line_no"] - 1)
            self.scroll_to_line_if_needed(snapshot["line_no"], lines)
            
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

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d        

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