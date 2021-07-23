from oui import add_listener, remove_listener, add_child, render_all
from oui.elements import Board

# Todo:
# close/minimize/maximize buttons (done)
# mouse motion
# overlapping bug (done)
# focus (done)

class WindowManager:
    def __init__(self):
        self.board = Board()
        add_child(self, self.board)
        self.moving_window = None
        self.move_start_event = None
        self.resizing_window = None
        self.resize_start_event = None
    
    def add_window(self, window, **params):
        add_listener(window, "window_move_start", self.on_window_move_start)
        add_listener(window, "window_focus", self.on_window_focus)
        add_listener(window, "maximize", self.on_window_maximize)
        add_listener(window, "close", self.on_window_close)
        add_listener(window, "window_resize_start", self.on_window_resize_start)
        add_child(self.board, window, **params)
    
    def on_window_move_start(self, evt):
        self.moving_window = evt.window
        self.move_start_event = evt
    
    def move_to_front(self, window):
        idx = self.board.children.index(window)
        if idx != len(self.board.children) - 1:
            self.board.children.pop(idx)
            self.board.children.append(window)
    
    def on_window_focus(self, evt):
        self.move_to_front(evt.window)
        render_all()
    
    def on_window_maximize(self, evt):
        window = evt.window
        self.move_to_front(window)
        if hasattr(window, "maximized") and window.maximized:
            window.abs_pos = window.org_pos
            del window.org_pos
            if hasattr(window, "org_size"):
                window.abs_size = window.org_size
                del window.org_size
            else:
                del window.abs_size
            window.maximized = False
        else:
            window.org_pos = window.abs_pos
            if hasattr(window, "abs_size"):
                window.org_size = window.abs_size
            window.abs_pos = (0, 0)
            window.abs_size = self.size
            window.maximized = True
        render_all()
    
    def on_window_resize_start(self, evt):
        window = evt.window
        self.resizing_window = window
        self.resize_start_event = evt
    
    def on_window_close(self, evt):
        window = evt.window
        self.board.children.remove(window)
        remove_listener(window, "window_move_start", self.on_window_move_start)
        remove_listener(window, "window_focus", self.on_window_focus)
        remove_listener(window, "close", self.on_window_close)
        render_all()
    
    def on_mouseup(self, evt):
        if self.moving_window:
            window = self.moving_window
            deltax = evt.x - self.move_start_event.x
            deltay = evt.y - self.move_start_event.y
            x, y = window.abs_pos
            window.abs_pos = (x + deltax, y + deltay)
            self.moving_window = None
            self.move_start_event = None
            render_all()
        if self.resizing_window:
            window = self.resizing_window
            deltax = 0
            if self.resize_start_event.direction in ["x", "both"]:
                deltax = evt.x - self.resize_start_event.x
            deltay = 0
            if self.resize_start_event.direction in ["y", "both"]:
                deltay = evt.y - self.resize_start_event.y
            wwidth, wheight = window.size
            new_wwidth = wwidth + deltax
            new_wheight = wheight + deltay
            window.abs_size = (new_wwidth, new_wheight)
            self.resizing_window = None
            self.resize_start_event = None
            render_all()
    
    def layout(self, constraints):
        self.board.layout(constraints)
        self.size = self.board.size
    
    def paint(self):
        self.board.region = self.region
        self.board.paint()
    