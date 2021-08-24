# Todo

# scroll_view for stack pane
# remember expand/collapse state across snapshots
# fix source line out of sync when debugging self
# optimize renders
# navigation is slow
# stack pane
# expand/collapse of objects/dicts/lists, etc
# fix border issue when part of window out of view
# centering status bar
# call hierarchy
# chronology
# search
# step out
# reverse step out

# tuples (done)
# lists (done)
# classes (done)
# fix overlapping windows clash (done)
# test nesting (done)
# objects (done)
# global variables (done)
# you have click twice to expand a tree (done)
# fix clicking on stack pane navigates the code pane as well (done)
# remove flicker when scrolling (done)
# fix: menu bar item click not working (done)
# why only sometimes navigation gives flicker? (done)
# optimize UI update to minimize flicker (done)
# status bar (done)
# rewind (done)
# fast forward (done)
# menu bar (done)
# show short file names rather than full path (done)
# arrow keys to navigate forward/backward in history (done)
# scroll_to_current_line_if_needed (done)
# Highlight current line (done)

import sys
from oui import *
from oui.elements import *
from sstring import *
from .navigator import Navigator
from .object_cache import ObjectCache
from .value_cache import ValueCache
import sqlite3
from .code_pane import CodePane
from .stack_pane import StackPane

class DebuggerGUI:
    def __init__(self, hist_filename):
        self.hist_filename = hist_filename
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.value_cache = ValueCache(self.conn, self.cursor)
        self.nav = Navigator(self.conn, self.cursor, self.cache)
        self.ui = VBox()
        self.content = Board()
        self.menu_bar = MenuBar(self.content)
        file_menu = Menu()
        file_menu.add_item(MenuItem("Open..."))
        file_menu.add_item(MenuItem("Exit"))
        self.menu_bar.add_menu(Text(" File "), file_menu)
        nav_menu = Menu()
        nav_menu.add_item(MenuItem("Step →", self.step))
        nav_menu.add_item(MenuItem("Reverse Step ←", self.reverse_step))
        nav_menu.add_item(MenuItem("Step Over ↴ ", self.step_over))
        nav_menu.add_item(MenuItem("Reverse Step Over ↰ ", self.reverse_step_over))
        self.menu_bar.add_menu(Text(" Navigation "), nav_menu)
        self.status_bar = Text(sstring("Status", [REVERSED]))
        
        add_child(self.ui, self.menu_bar, stretch="x")
        add_child(self.ui, self.content, stretch="both")
        add_child(self.ui, self.status_bar, stretch="x")
        add_listener(self.ui, "keypress", self.on_keypress)
        
        self.win_manager = WindowManager()
        add_child(self.content, self.win_manager)
        self.code_pane = CodePane()
        add_listener(self.code_pane, "click", self.on_code_pane_click)
        add_listener(self.code_pane, "rightmousedown", self.on_code_pane_right_click)
        self.code_win = Window("Code", self.code_pane)
        log("code_win %r" % self.code_win)
        self.win_manager.add_window(self.code_win,
            abs_pos=(1, 1),
            abs_size=(60, 30)
        )
        self.stack_pane = StackPane(self.cache, self.value_cache)
        self.stack_win = Window("Variables", self.stack_pane)
        log("stack_win %r" % self.stack_win)
        self.win_manager.add_window(self.stack_win,
            abs_pos=(64, 4),
            abs_size=(40, 20)
        )
        self.last_snapshot = self.nav.get_last_snapshot()
        snapshot = self.cache.get_snapshot(1)
        self.goto_snapshot(snapshot)
    
    def goto_snapshot(self, snapshot):
        if snapshot is None:
            return
        log("goto_snapshot %s" % snapshot["id"])
        self.snapshot = snapshot
        fun_call = self.cache.get_fun_call(self.snapshot["fun_call_id"])
        self.fun_call = fun_call
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        self.fun_code = fun_code
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        self.code_file = code_file
        self.error = self.cache.get_error_by_snapshot(self.snapshot["id"])
        
        self.update_code_pane()
        self.update_status()
        self.update_stack_pane()
    
    def update_code_pane(self):
        snapshot = self.snapshot
        self.code_win.set_title(self.get_file_name(self.code_file["file_path"]))
        self.code_pane.set_location(self.code_file, snapshot["line_no"])
        self.code_pane.scroll_to_current_line_if_needed()
    
    def update_stack_pane(self):
        self.stack_pane.update(self.snapshot)
    
    def update_status(self):
        message = "Step %d of %d: %s() line %d" % (
            self.snapshot["id"], 
            self.last_snapshot["id"],
            self.fun_code["name"],
            self.snapshot["line_no"],
        )
        if self.error:
            message += ", Error: %s" % self.error["message"]
        self.status_bar.set_text(sstring(message, [REVERSED]))
    
    def start(self):
        run(self.ui)
    
    def step(self, evt):
        next = self.cache.get_snapshot(self.snapshot["id"] + 1)
        self.goto_snapshot(next)
    
    def reverse_step(self, evt):
        next = self.cache.get_snapshot(self.snapshot["id"] - 1)
        self.goto_snapshot(next)
    
    def step_over(self, evt):
        next = self.nav.step_over(self.snapshot)
        self.goto_snapshot(next)
    
    def reverse_step_over(self, evt):
        next = self.nav.step_over_backward(self.snapshot)
        self.goto_snapshot(next)
    
    def on_keypress(self, evt):
        if evt.key == "UP_ARROW":
            self.reverse_step_over(evt)
        elif evt.key == "DOWN_ARROW":
            self.step_over(evt)
        elif evt.key == "LEFT_ARROW":
            self.reverse_step(evt)
        elif evt.key == "RIGHT_ARROW":
            self.step(evt)
            
    def on_code_pane_click(self, evt):
        line_no = self.code_pane.get_line_no_for_y(evt.y)
        next = self.nav.fast_forward(self.code_file["id"], line_no, self.snapshot["id"])
        self.goto_snapshot(next)
        
    def on_code_pane_right_click(self, evt):
        line_no = self.code_pane.get_line_no_for_y(evt.y)
        next = self.nav.rewind(self.code_file["id"], line_no, self.snapshot["id"])
        self.goto_snapshot(next)
    
    def get_file_name(self, filepath):
        parts = filepath.split("/")
        return parts[-1]
    
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
        

def main():
    if len(sys.argv) < 2:
        print("Please provide a history file.")
    
    hist_filename = sys.argv[1]
    dbui = DebuggerGUI(hist_filename)
    dbui.start()
    
if __name__ == "__main__":
    main()