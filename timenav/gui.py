# data fetching / display
# activate scroll panes (done)
# integrate navigator into here (done)
# test step methods (done)

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
from events import *

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
        print()
        
    def clean_up(self):
        self.restore_term_settings()
        mouse_off()
        cursor_on()
        # mouse_motion_off()
    
    def draw_divider(self):
        x = self.code_pane.box.width + 1
        for i in range(self.code_pane.box.height):
            print_at(x, i + 1, "┃")
    
    def run(self):
        self.save_term_settings()
        atexit.register(self.clean_up)
        tty.setraw(sys.stdin)
        clear_screen()
        mouse_on()
        cursor_off()
        self.draw_divider()
        
        self.last_snapshot = self.nav.get_last_snapshot()
        self.goto_snapshot(self.cache.get_snapshot(3))
        
        while True:
            inp = get_input()
            if inp == "q":
                break
            data = list(map(ord, inp))
            if data == RIGHT_ARROW:
                next = self.cache.get_snapshot(self.snapshot["id"] + 1)
                self.goto_snapshot(next)
            elif data == LEFT_ARROW:
                next = self.cache.get_snapshot(self.snapshot["id"] - 1)
                self.goto_snapshot(next)
            elif data == DOWN_ARROW:
                next = self.nav.step_over(self.snapshot)
                self.goto_snapshot(next)
            elif data == UP_ARROW:
                next = self.nav.step_over_backward(self.snapshot)
                self.goto_snapshot(next)
            else:
                events = decode_input(inp)
                for event in events:
                    if event.type == "wheelup":
                        if event.x > self.code_pane.box.width + 1:
                            self.stack_pane.scroll_up()
                        elif event.x < self.code_pane.box.width + 1:
                            self.code_pane.scroll_up()
                    elif event.type == "wheeldown":
                        if event.x > self.code_pane.box.width + 1:
                            self.stack_pane.scroll_down()
                        elif event.x < self.code_pane.box.width + 1:
                            self.code_pane.scroll_down()

    def goto_snapshot(self, next):
        if next is None:
            return
        
        self.snapshot = next
        fun_call = self.cache.get_fun_call(self.snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        
        lines = []
        if code_file["source"]:
            lines = code_file["source"].split("\n")
        self.display_source(lines, self.code_pane)
        self.update_stack_pane(self.snapshot)
        self.code_pane.set_highlight(self.snapshot["line_no"] - 1)
        self.scroll_to_line_if_needed(self.snapshot["line_no"], lines)
        
        self.update_status(self.snapshot)


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
        
    def render_value(self, value, level):
        if value is None:
            return ["None"]
        tp = value["type_name"]
        if tp == "none":
            return ["None"]
        elif tp in ["str", "int", "float"]:
            return ["(%d) %s %s" % (value["id"], tp, value["value"])]
        else:
            return ["%s %r" % (tp, value["value"])]
    
    def update_stack_pane(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        version = snapshot["id"] + 1
        locals_id = fun_call["locals"]
        globals_id = fun_call["globals"]
        lines = []
        
        local_members = self.cache.get_members(locals_id)
        locals_dict = []
        lines.append("Locals %d" % locals_id)
        for mem in local_members:
            key_id = mem['key']
            value_id = mem['value']
            key = self.cache.get_value(key_id, version)
            key_lines = self.render_value(key, 1)
            value = self.cache.get_value(value_id, version)
            value_lines = self.render_value(value, 1)
            if len(key_lines) == 1:
                value_lines[0] = "%s = %s" % (key_lines[0], value_lines[0])
            else:
                raise Exception("Not handled %r" % key_lines)
            lines.extend(value_lines)
            # lines.append("(%d, %d) %s = %s" % (key_id, value_id, key and key["value"], value and value["value"]))
        # 
        # lines.append("Globals %d" % globals_id)
        # global_members = self.cache.get_members(globals_id)
        # globals_dict = []
        # for mem in global_members:
        #     key_id = mem['key']
        #     value_id = mem['value']
        #     key = self.cache.get_value(key_id, version)
        #     self.render_value(key, lines, 1)
        #     lines.append(" = ")
        #     value = self.cache.get_value(value_id, version)
        #     self.render_value(value, lines, 1)
        #     # lines.append("(%d, %d) %s = %s" % (key_id, value_id, key and key["value"], value and value["value"]))

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