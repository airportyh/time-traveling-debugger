# integrate navigator into here
# test step methods

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
import random
from object_cache import ObjectCache
from navigator import Navigator

# UI Element interface:
# UIElement:
#    def layout(bounding_box)

class NavigatorGUI:
    def __init__(self, hist_filename):
        self.hist_filename = hist_filename
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.nav = Navigator(self.conn, self.cursor, self.cache)
        termsize = os.get_terminal_size()
        code_pane_width = termsize.columns // 2
        stack_pane_left = code_pane_width + 2
        stack_pane_width = termsize.columns - code_pane_width - 1
        code_pane_height = termsize.lines - 1
        stack_pane_height = code_pane_height
        self.code_pane = TextPane(Box(1, 1, code_pane_width, code_pane_height))
        self.stack_pane = TextPane(Box(stack_pane_left, 1, stack_pane_width, stack_pane_height))
        self.status_pane = TextPane(Box(1, termsize.lines, termsize.columns, 1))
        self.draw_divider()
    
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
    
    def draw_divider(self):
        x = self.code_pane.box.width + 1
        for i in range(self.code_pane.box.height):
            print_at(x, i + 1, "┃")
    
    def run(self):
        self.save_term_settings()
        atexit.register(self.clean_up)
        tty.setraw(sys.stdin)
        clear_screen()
        self.draw_divider()
        
        snapshot = self.cache.get_snapshot(1)
        self.last_snapshot = self.nav.get_last_snapshot()
        
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        
        lines = []
        if code_file["source"]:
            lines = code_file["source"].split("\n")
        self.display_source(lines, self.code_pane)
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
                next = self.nav.step_over(snapshot)
            elif data == UP_ARROW:
                next = self.nav.step_over_backward(snapshot)
            else:
                continue

            if next:
                snapshot = next
            fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
            fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
            code_file = self.cache.get_code_file(fun_code["code_file_id"])
            
            lines = []
            if code_file["source"]:
                lines = code_file["source"].split("\n")
            self.display_source(lines, self.code_pane)
            self.update_stack_pane(snapshot)
            self.code_pane.set_highlight(snapshot["line_no"] - 1)
            self.scroll_to_line_if_needed(snapshot["line_no"], lines)
            
            self.update_status(snapshot)

    def display_source(self, file_lines, code_pane):
        gutter_width = len(str(len(file_lines) + 1))

        lines = []
        for i, line in enumerate(file_lines):
            line = line.replace("\t", "    ")
            lineno = i + 1
            lineno_display = str(i + 1).rjust(gutter_width) + ' '
            line_display = lineno_display + line
            lines.append(line_display)

        code_pane.set_lines(lines)
    
    def update_stack_pane(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        version = snapshot["id"] + 1
        locals_id = fun_call["locals"]

        globals_id = fun_call["globals"]
        
        lines = [
            "Snapshot %d" % snapshot["id"],
            "Version %d" % version,
            "Locals: %d" % locals_id,
            "Globals: %d" % globals_id,
        ]

        global_members = self.cache.get_members(globals_id)
        globals_dict = []
        for mem in global_members:
            key_id = mem['key']
            value_id = mem['value']
            key = self.cache.get_value(key_id, version)
            value = self.cache.get_value(value_id, version)
            lines.append("(%d, %d) %s = %s" % (key_id, value_id, key and key["value"], value and value["value"]))

        self.stack_pane.set_lines(lines)
            
    def update_status(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        message = "Step %d of %d: %s() line %d (cache %d/%d)" % (
            snapshot["id"], 
            self.last_snapshot["id"],
            fun_code["name"],
            snapshot["line_no"],
            len(self.cache.cache),
            self.cache.cache.capacity
        )
        termsize = os.get_terminal_size()
        message = message[0:termsize.columns].center(termsize.columns)
        self.status_pane.set_lines([message])
        self.status_pane.set_highlight(0)
            
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
        nav = NavigatorGUI(sys.argv[1])
        try:
            nav.run()
        except Exception as e:
            nav.clean_up()
            raise e