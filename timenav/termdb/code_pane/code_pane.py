from oui import add_child, defer_layout, defer_paint, fire_event, Event, add_listener
from oui.elements import Text, VBox, HBox, ScrollView, MenuButton, Menu, MenuItem
from .code_lines_pane import CodeLinesPane
from sstring import *

class CodePane:
    def __init__(self, cache, navigator, container):
        self.snapshot = None
        self.cache = cache
        self.nav = navigator
        self.container = container
        self.code_lines_pane = CodeLinesPane(self.cache)
        self.scroll_view = ScrollView(self.code_lines_pane, line_numbers=True)
        self.vbox = VBox()
        self.toolbar = HBox()
        self.init_menu()
        add_child(self.toolbar, self.file_menu_button)
        self.hits_button = Text(sstring(" Show hits ", [BG_BLUE]))
        add_listener(self.hits_button, "click", self.hits_button_clicked)
        add_child(self.toolbar, self.hits_button)
        add_child(self.vbox, self.toolbar)
        add_child(self.vbox, self.scroll_view, stretch="both")
        add_child(self, self.vbox)
    
    def layout(self, constraints):
        defer_layout(self, self.vbox, constraints)
    
    def paint(self):
        defer_paint(self, self.vbox)
    
    def init_menu(self):
        self.file_menu = Menu()
        code_files = self.cache.get_code_files_lite()
        for code_file in sorted(code_files, key=self.get_filename):
            filename = self.get_filename(code_file)
            self.file_menu.add_item(MenuItem(filename, self.on_file_selected, key=code_file["id"]))
        self.file_menu_button = MenuButton(Text("File"), self.file_menu, self.container)
    
    def on_click(self, evt):
        line_no = self.get_line_for_y(evt.y)
        snapshot = self.nav.fast_forward(self.code_file["id"], line_no, self.snapshot["id"])
        fire_event(self, Event("goto_snapshot", snapshot_id=snapshot and snapshot["id"]), bubble=True)
    
    def on_rightmousedown(self, evt):
        line_no = self.get_line_for_y(evt.y)
        snapshot = self.nav.rewind(self.code_file["id"], line_no, self.snapshot["id"])
        fire_event(self, Event("goto_snapshot", snapshot_id=snapshot and snapshot["id"]), bubble=True)
    
    def on_file_selected(self, event):
        menu_item = event.value
        code_file_id = menu_item.key
        code_file = self.cache.get_code_file(code_file_id)
        self.set_location(code_file, None)
        self.code_lines_pane.set_location(code_file, None)
    
    def get_filename(self, code_file):
        return code_file["file_path"].split("/")[-1]
    
    def get_line_for_y(self, y):
        return self.scroll_view.get_content_line_for_y(y)
    
    def set_snapshot(self, snapshot):
        self.snapshot = snapshot
        fun_call = self.cache.get_fun_call(snapshot["fun_call_id"])
        fun_code = self.cache.get_fun_code(fun_call["fun_code_id"])
        code_file = self.cache.get_code_file(fun_code["code_file_id"])
        self.set_location(code_file, snapshot["line_no"])
    
    def set_location(self, code_file, line_no):
        self.code_file = code_file
        self.code_lines_pane.set_location(code_file, line_no)
        filename = code_file["file_path"].split("/")[-1]
        self.file_menu_button.label.set_text(filename + " ▼ ")
        if line_no:
            self.scroll_view.ensure_line_viewable(line_no)
        else:
            self.scroll_view.ensure_line_viewable(1)
    
    def hits_button_clicked(self, evt):
        line_no = self.code_lines_pane.current_line
        code_file = self.code_lines_pane.code_file
        fire_event(self, Event("hits_request", code_file=code_file, line_no=line_no))
    