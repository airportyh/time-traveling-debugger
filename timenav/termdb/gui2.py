# Todo

# back button (shortcut)
# object lifetime

# jump to line in current file
# variables, if amount of used space dramatically reduces, the offset should be adjusted so the user
#    can see stuff (scroll_view in general?)
# search within a file
# allow you to just type debug to debug the last run program
# clicking away should close a dropdown menu (do we need capture phase?)
# clicking away should close search bar
# scroll view y offset can be negative (rare bug)
# variables panel display sets (fix sets in recreate)
# maybe have window manager share the same board with the top level

# smart launch bar
#   * jump to file (done)
#   * jump to function or method (done)
#   * jump to snapshot (done)
# add scoring to fuzzy_contain (done)
# switching a file in code pane is slow (done)
# indicator to show a line has been reached or not (done)
# show all snapshots that hit a line of code
# timeline: show file name maybe after a function call / before each indent
# see_call for gui
# show error message even when caught
# searching
# hierarchical scroll bar for timeline
# step out
# reverse step out
# fix border issue when part of window out of view

# switch files for code pane (done)
# ensure line viewable seems not to work when line is last line? (done)
# still show line numbers even if scroll is away from them (fixed position) (done)
# bug: maximize is making window too big (done)
# view menu (done)
# centralize code lines cache (done)
# timeline 2: click to fast-forward / rewind (done)
#    * fix bugs so it can be used for gui2 itself (done)
# bug in displaying dict keys in variable panel (done)
# jump to error first thing (done)
# code pane 2 (done)
#  * current line highlight (done)
#  * scroll current line to visible (done)
# code pane 2: scrolling too far down? (done)
# time-line (done)
# scroll event leak (done)
# boolean display bug? (done)
# remember expand/collapse state across snapshots (done)
# stack pane (done)
# click and scroll events on one window is received by window underneath (done)
# expand/collapse of objects/dicts/lists, etc (done)
# optimize renders (done)
# running debugger in pyrewind too slow to be useful (done)
# scroll_view for stack pane too slow (done)
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
from .timeline import Timeline
from .search_bar import SearchBar
from .function_search_bar import FunctionSearchBar
from .goto_step_bar import GotoStepBar

class DebuggerGUI:
    def __init__(self, hist_filename, begin_snapshot_id=None):
        self.hist_filename = hist_filename
        self.init_db()
        self.cache = ObjectCache(self.conn, self.cursor)
        self.value_cache = ValueCache(self.conn, self.cursor)
        self.nav = Navigator(self.conn, self.cursor, self.cache)
        
        self.last_snapshot = self.nav.get_last_snapshot()
        
        self.init_ui()
        self.term_file = open("term.txt", "w")
        
        self.init_errors()
        
        if begin_snapshot_id is None:
            if self.first_error:
                begin_snapshot_id = self.first_error["snapshot_id"]
            else:
                begin_snapshot_id = 1
        
        snapshot = self.cache.get_snapshot(begin_snapshot_id)
        self.goto_snapshot(snapshot)
    
    def init_errors(self):
        errors = self.nav.get_all_errors()
        self.first_error = None
        if len(errors) > 0:
            self.first_error = errors[0]
        errors_dict = {}
        for error in errors:
            errors_dict[error["snapshot_id"]] = error
        self.errors = errors_dict
    
    def init_ui(self):
        self.ui = VBox()
        self.content = Board()
        
        self.init_menu_bar()
        
        self.status_bar = Text(sstring("", [REVERSED]))
        
        add_child(self.ui, self.menu_bar, stretch="x")
        add_child(self.ui, self.content, stretch="both")
        add_child(self.ui, self.status_bar, stretch="x")
        add_listener(self.ui, "keypress", self.on_keypress)
        
        self.win_manager = WindowManager()
        add_child(self.content, self.win_manager, stretch="both")
        self.init_code_pane()
        self.init_stack_pane()
        self.init_timeline()
        add_listener(self.win_manager, "add_window", self.on_add_window)
        add_listener(self.win_manager, "close_window", self.on_close_window)
    
    def init_menu_bar(self):
        self.menu_bar = MenuBar(self.content)
        file_menu = Menu()
        file_menu.add_item(MenuItem("Quit q", self.exit))
        self.menu_bar.add_menu(Text(" File "), file_menu)
        nav_menu = Menu()
        nav_menu.add_item(MenuItem("Step →", self.step))
        nav_menu.add_item(MenuItem("Reverse Step ←", self.reverse_step))
        nav_menu.add_item(MenuItem("Step Over ↓", self.step_over))
        nav_menu.add_item(MenuItem("Reverse Step Over ↑", self.reverse_step_over))
        self.menu_bar.add_menu(Text(" Navigation "), nav_menu)
        view_menu = Menu()
        self.code_view_menu_item = MenuItem("✓ Code", self.show_code_win)
        view_menu.add_item(self.code_view_menu_item)
        self.variables_view_menu_item = MenuItem("✓ Variables", self.show_stack_win)
        view_menu.add_item(self.variables_view_menu_item)
        self.timeline_view_menu_item = MenuItem("  Timeline", self.show_timeline_win)
        view_menu.add_item(self.timeline_view_menu_item)
        self.menu_bar.add_menu(Text(" View "), view_menu)
    
    def show_code_win(self, evt):
        if self.win_manager.has_window(self.code_win):
            self.win_manager.move_to_front(self.code_win)
        else:
            self.win_manager.add_window(self.code_win,
                abs_pos=(0, 0),
                abs_size=(60, 25)
            )
            
    def show_stack_win(self, evt):
        if self.win_manager.has_window(self.stack_win):
            self.win_manager.move_to_front(self.stack_win)
        else:
            self.win_manager.add_window(self.stack_win,
                abs_pos=(61, 0),
                abs_size=(40, 25)
            )
    
    def show_timeline_win(self, evt):
        if self.win_manager.has_window(self.timeline_win):
            self.win_manager.move_to_front(self.timeline_win)
        else:
            self.win_manager.add_window(self.timeline_win,
                abs_pos=(66, 1),
                abs_size=(40, 20)
            )
    
    def init_code_pane(self):
        self.code_pane = CodePane(self.cache, self.nav, self.content)
        self.code_win = Window("Code", self.code_pane)
        add_listener(self.code_pane, "goto_snapshot", self.on_goto_snapshot)
        self.win_manager.add_window(self.code_win,
            abs_pos=(0, 0),
            abs_size=(60, 25)
        )
    
    def init_stack_pane(self):
        self.stack_pane = StackPane(self.cache, self.value_cache)
        self.stack_win = Window("Variables", self.stack_pane)
        self.win_manager.add_window(self.stack_win,
            abs_pos=(60, 0),
            abs_size=(40, 25)
        )
    
    def init_timeline(self):
        self.timeline = Timeline(self.last_snapshot["id"], self.cache)
        add_listener(self.timeline, "click", self.on_timeline_click)
        self.timeline_scroll_view = ScrollView(self.timeline, line_numbers=True)
        self.timeline_win = Window("Timeline", self.timeline_scroll_view)
        # self.win_manager.add_window(self.timeline_win,
        #     abs_pos=(40, 1),
        #     abs_size=(60, 20)
        # )
    
    def on_goto_snapshot(self, event):
        self.goto_snapshot(event.snapshot)
    
    def goto_snapshot(self, snapshot):
        if snapshot is None:
            return
        self.snapshot = snapshot
        self.fun_call = self.cache.get_fun_call(self.snapshot["fun_call_id"])
        self.fun_code = self.cache.get_fun_code(self.fun_call["fun_code_id"])
        self.code_file = self.cache.get_code_file(self.fun_code["code_file_id"])
        self.error = self.errors.get(self.snapshot["id"])
        
        self.update_code_pane()
        self.update_status()
        self.update_stack_pane()
        self.update_timeline()
        self.update_term_file()
    
    def update_code_pane(self):
        self.code_pane.set_snapshot(self.snapshot)
        
    def update_timeline(self):
        self.timeline.set_current_snapshot_id(self.snapshot["id"])
        self.timeline_scroll_view.ensure_line_viewable(self.snapshot["id"])
    
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
    
    def on_add_window(self, evt):
        self.update_view_menu_items()
    
    def on_close_window(self, evt):
        self.update_view_menu_items()
    
    def update_view_menu_items(self):
        if self.win_manager.has_window(self.code_win):
            self.code_view_menu_item.label = sstring("✓ Code")
        else:
            self.code_view_menu_item.label = sstring("  Code")
        if self.win_manager.has_window(self.stack_win):
            self.variables_view_menu_item.label = sstring("✓ Variables")
        else:
            self.variables_view_menu_item.label = sstring("  Variables")
        if self.win_manager.has_window(self.timeline_win):
            self.timeline_view_menu_item.label = sstring("✓ Timeline")
        else:
            self.timeline_view_menu_item.label = sstring("  Timeline")
    
    def on_keypress(self, evt):
        if evt.key == "UP_ARROW":
            self.reverse_step_over(evt)
        elif evt.key == "DOWN_ARROW":
            self.step_over(evt)
        elif evt.key == "LEFT_ARROW":
            self.reverse_step(evt)
        elif evt.key == "RIGHT_ARROW":
            self.step(evt)
        elif evt.key == "e":
            self.goto_snapshot(self.last_snapshot)
        elif evt.key == "s":
            self.goto_to_first_snapshot()
        elif evt.key == "p":
            self.open_search_bar()
        elif evt.key == "f":
            self.open_function_search_bar()
        elif evt.key == "g":
            self.open_goto_step_bar()
        elif evt.key == "q":
            quit()
    
    def on_timeline_click(self, evt):
        snapshot_id = self.timeline_scroll_view.get_content_line_for_y(evt.y)
        next = self.cache.get_snapshot(snapshot_id)
        self.goto_snapshot(next)
    
    def open_search_bar(self):
        self.search_bar = SearchBar(self.cache, self.content)
        cwidth, cheight = self.content.size
        self.search_bar.layout(BoxConstraints(
            min_width = cwidth,
            max_width = cwidth,
            max_height = cheight
        ))
        swidth, sheight = self.search_bar.size
        x = (cwidth - swidth) // 2
        y = min(0, (cheight - sheight) // 2)
        add_child(self.content, self.search_bar,
            abs_pos=(x, y),
            abs_size=(swidth, sheight)
        )
        focus_next_element_from(self.search_bar, None)
        add_listener(self.search_bar, "select", self.on_file_selected)
        
    def on_file_selected(self, evt):
        code_file_id = evt.value
        code_file = self.cache.get_code_file(code_file_id)
        self.code_pane.set_location(code_file, None)
        remove_child(self.content, self.search_bar)
        self.search_bar = None
        
    def open_function_search_bar(self):
        self.function_search_bar = FunctionSearchBar(self.cache, self.content)
        cwidth, cheight = self.content.size
        self.function_search_bar.layout(BoxConstraints(
            min_width = cwidth,
            max_width = cwidth,
            max_height = cheight
        ))
        swidth, sheight = self.function_search_bar.size
        x = (cwidth - swidth) // 2
        y = min(0, (cheight - sheight) // 2)
        add_child(self.content, self.function_search_bar,
            abs_pos=(x, y),
            abs_size=(swidth, sheight)
        )
        focus_next_element_from(self.function_search_bar, None)
        add_listener(self.function_search_bar, "select", self.on_function_selected)
    
    def on_function_selected(self, evt):
        fun_code_id = evt.value
        fun_code = self.cache.get_fun_code(fun_code_id)
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        self.code_pane.set_location(code_file, fun_code["line_no"])
        remove_child(self.content, self.function_search_bar)
        self.function_search_bar = None
    
    def open_goto_step_bar(self):
        self.goto_step_bar = GotoStepBar()
        cwidth, cheight = self.content.size
        self.goto_step_bar.layout(BoxConstraints(
            min_width = cwidth,
            max_width = cwidth,
            max_height = cheight
        ))
        bwidth, bheight = self.goto_step_bar.size
        x = (cwidth - bwidth) // 2
        y = min(0, (cheight - bheight) // 2)
        add_child(self.content, self.goto_step_bar,
            abs_pos=(x, y),
            abs_size=(bwidth, bheight)
        )
        focus_next_element_from(self.goto_step_bar, None)
        add_listener(self.goto_step_bar, "select", self.on_goto_step_selected)
    
    def on_goto_step_selected(self, evt):
        step_num = evt.value
        next = self.cache.get_snapshot(step_num)
        self.goto_snapshot(next)
        remove_child(self.content, self.goto_step_bar)
        self.goto_step_bar = None
    
    def goto_to_first_snapshot(self):
        next = self.cache.get_snapshot(1)
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
    
    def update_term_file(self):
        outputs = self.nav.get_print_output_up_to(self.snapshot["id"])
        self.term_file.write('\x1B[0m\x1B[2J\x1Bc')
        for output in outputs:
            self.term_file.write(output["data"])
            self.term_file.flush()
    
    def exit(self, evt):
        clean_up()
        exit(0)

def main():
    if len(sys.argv) < 2:
        print("Please provide a history file.")
    
    hist_filename = sys.argv[1]
    begin_snapshot_id = None
    if len(sys.argv) >= 3:
        begin_snapshot_id = int(sys.argv[2])
    dbui = DebuggerGUI(hist_filename, begin_snapshot_id)
    dbui.start()
    
if __name__ == "__main__":
    main()