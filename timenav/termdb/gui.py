# boolean rendering
# Cmd-p to select file
# display closures
# finish and finish reverse
# show function parameters
# some bt frames not showing?
# bug with permutation_2.py rest has value of [1, 1], should be [2, 3]
# test on current work (self, qt, oui, graphvis)

# allow jumping to the end (done)
# perf tuning: gui.py debugging itself is slow up to a point (done)
# unquote numbers (done)
# implement caching scheme for values so that moving is fast (done)
# unquote var names (done)
# jump to line (done)
# display backtrace (done)
# leaner display for values (done)
# exception (done)
# data fetching / display (80% done)
# activate scroll panes (done)
# integrate navigator into here (done)
# test step methods (done)

import termios
import sys
import tty
import os
from functools import reduce
import atexit
import sqlite3
import random
import time

from term_util import *
from events import *
from .text_pane import *
from .object_cache import ObjectCache
from .value_cache import ValueCache
from .navigator import Navigator, log
from .debug_value_renderer import DebugValueRenderer
from .value_renderer import ValueRenderer
from .debugger_consts import *
from string_util import add_indent

# sys.paths.append(os.path.dirname(__FILE__))

class NavigatorGUI:
    def __init__(self, hist_filename, begin_snapshot_id):
        self.hist_filename = hist_filename
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.value_cache = ValueCache(self.conn, self.cursor)
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
        self.value_renderer = ValueRenderer(self.cache, self.value_cache)
        self.term_file = open("term.txt", "w")
        self.begin_snapshot_id = begin_snapshot_id

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
        sys.stdin.reconfigure(encoding='latin1')
        self.save_term_settings()
        atexit.register(self.clean_up)
        tty.setraw(sys.stdin)
        clear_screen()
        mouse_on()
        cursor_off()
        self.draw_divider()

        self.last_snapshot = self.nav.get_last_snapshot()
        error = self.nav.get_first_error()
        if error:
            self.begin_snapshot_id = error["snapshot_id"]
        self.goto_snapshot(self.cache.get_snapshot(self.begin_snapshot_id))

        while True:
            inp = get_input()
            if inp == "q":
                break
            data = list(map(ord, inp))
            if inp == "e":
                self.goto_snapshot(self.last_snapshot)
            elif data == RIGHT_ARROW:
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
                    elif event.type == "altwheelup":
                        if event.x > self.code_pane.box.width + 1:
                            self.stack_pane.scroll_left()
                        elif event.x < self.code_pane.box.width + 1:
                            self.code_pane.scroll_left()
                    elif event.type == "altwheeldown":
                        if event.x > self.code_pane.box.width + 1:
                            self.stack_pane.scroll_right()
                        elif event.x < self.code_pane.box.width + 1:
                            self.code_pane.scroll_right()
                    elif event.type == "mousedown":
                        if event.x < self.code_pane.box.width + 1:
                            line_no = self.code_pane.get_line_no_for_y(event.y)
                            next = self.nav.fast_forward(self.code_file["id"], line_no, self.snapshot["id"])
                            self.goto_snapshot(next)
                    elif event.type == "rightmousedown":
                        if event.x < self.code_pane.box.width + 1:
                            line_no = self.code_pane.get_line_no_for_y(event.y)
                            next = self.nav.rewind(self.code_file["id"], line_no, self.snapshot["id"])
                            self.goto_snapshot(next)

    def goto_snapshot(self, next):
        if next is None:
            return
        start = time.time()
        self.snapshot = next
        fun_call = self.cache.get_fun_call(self.snapshot["fun_call_id"])
        self.fun_call = fun_call
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        self.fun_code = fun_code
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        self.code_file = code_file
        self.error = self.cache.get_error_by_snapshot(self.snapshot["id"])
        end1 = time.time()
        log("goto_snapshot db part took %f seconds" % (end1 - start))
        start = time.time()
        lines = []
        if code_file["source"]:
            lines = code_file["source"].split("\n")
        self.display_source(lines, self.code_pane)
        end2 = time.time()
        log("goto_snapshot display_source part took %f seconds" % (end2 - start))
        start = time.time()
        self.update_stack_pane()
        end3 = time.time()
        log("goto_snapshot update_stack_pane part took %f seconds" % (end3 - start))
        start = time.time()
        self.code_pane.set_highlight(self.snapshot["line_no"] - 1)
        self.scroll_to_line_if_needed(self.snapshot["line_no"], lines)
        end4 = time.time()
        log("goto_snapshot highlight and scroll part took %f seconds" % (end4 - start))
        self.update_status(self.snapshot)
        self.update_term_file()

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

    def filename(self, code_file):
        parts = code_file["file_path"].split("/")
        if len(parts) > 0:
            return parts[-1]
        return code_file["file_path"]

    def update_stack_pane(self):
        snapshot = self.snapshot
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        version = snapshot["id"]
        locals_id = fun_call["locals"]
        globals_id = fun_call["globals"]
        lines = []

        local_members = self.cache.get_members(locals_id)
        locals_dict = []
        lines.append("%s() - %s: %d" % (fun_code["name"], self.filename(code_file), snapshot["line_no"]))
        # lines.append("Locals %d" % locals_id)
        for mem in local_members:
            key_id = mem['key']
            value_id = mem['value']
            key = self.value_cache.get_value(key_id, version)
            value = self.value_cache.get_value(value_id, version)
            if value is None:
                continue
            value_lines = self.value_renderer.render_value(value, version, set(), 1)
            value_lines[0] = "%s = %s" % (key["value"], value_lines[0])
            lines.extend(add_indent(value_lines))

        # lines.append("Globals %d" % globals_id)
        global_members = self.cache.get_members(globals_id)
        for mem in global_members:
            key_id = mem['key']
            value_id = mem['value']
            key = self.value_cache.get_value(key_id, version)
            value = self.value_cache.get_value(value_id, version)
            if value is None:
                continue
            value_lines = self.value_renderer.render_value(value, version, set(), 1)
            value_lines[0] = "%s = %s" % (key["value"], value_lines[0])
            lines.extend(add_indent(value_lines))

        lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        while fun_call["parent_id"]:
            fun_call = self.cache.get_fun_call(fun_call["parent_id"])
            start_snapshot = self.nav.get_snapshot_by_start_fun_call(fun_call["id"])
            fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
            code_file = self.cache.get_code_file(fun_code["code_file_id"])

            if start_snapshot:
                lines.append("%s() - %s: %d" % (fun_code["name"], self.filename(code_file), start_snapshot["line_no"]))
            else:
                lines.append("%s() - %s" % (fun_code["name"], self.filename(code_file)))

        self.stack_pane.set_lines(lines)

    def update_status(self, snapshot):
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        message = "Step %d of %d: %s() line %d" % (
            snapshot["id"], 
            self.last_snapshot["id"],
            fun_code["name"],
            snapshot["line_no"],
        )
        if self.error:
            message += ", Error: %s" % self.error["message"]
        termsize = os.get_terminal_size()
        message = message[0:termsize.columns].center(termsize.columns)
        self.status_pane.set_lines([message])
        self.status_pane.set_highlight(0)

    def update_term_file(self):
        outputs = self.nav.get_print_output_up_to(self.snapshot["id"])
        self.term_file.write('\x1B[0m\x1B[2J\x1Bc')
        for output in outputs:
            self.term_file.write(output["data"])
            self.term_file.flush()

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
        begin_snapshot_id = 1
        if len(sys.argv) >= 3:
            begin_snapshot_id = int(sys.argv[2])
        nav = NavigatorGUI(sys.argv[1], begin_snapshot_id)
        try:
            nav.run()
        except Exception as e:
            nav.clean_up()
            raise e