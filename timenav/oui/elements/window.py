from oui import BoxConstraints, add_child, fire_event, add_listener, defer_layout, defer_paint, repaint
from oui.elements import Text, VBox, Border, HBox
from .space import Space
from sstring import sstring, BG_WHITE, BLACK, BG_BRIGHT_WHITE, REVERSED
from events import Event

class Window:
    def __init__(self, title, content):
        self.title = title
        self.title_bar = TitleBar(self.title, self)
        self.content = content
        self.vbox = VBox(same_item_width=True)
        add_child(self.vbox, self.title_bar, stretch="x")
        self.border = WindowBorder(self.content, self)
        add_child(self.vbox, self.border, stretch="both")
        add_child(self, self.vbox)
    
    def layout(self, constraints):
        defer_layout(self, self.vbox, constraints)
    
    def paint(self):
        defer_paint(self, self.vbox)
    
    def set_title(self, title):
        self.title = title
        self.title_bar.set_title(title)
        
    def on_title_label_mousedown(self, evt):
        fire_event(self, Event("window_move_start", window=self, x=evt.x, y=evt.y))
        fire_event(self, Event("window_focus", window=self))
    
    def on_click(self, evt):
        fire_event(self, Event("window_focus", window=self))
        evt.stop_propagation()
        
    def on_wheelup(self, evt):
        evt.stop_propagation()
    
    def on_wheeldown(self, evt):
        evt.stop_propagation()
    
    def on_mousedown(self, evt):
        evt.stop_propagation()
    
    def on_rightmousedown(self, evt):
        evt.stop_propagation()
    
    def on_mousemove(self, evt):
        evt.stop_propagation()
    
    def on_mousedrag(self, evt):
        evt.stop_propagation()
    
    def on_altwheeldown(self, evt):
        evt.stop_propagation()
    
    def on_altwheelup(self, evt):
        evt.stop_propagation()
        
class TitleBar:
    def __init__(self, title, window):
        style = [REVERSED]
        self.style = style
        self.title = title
        self.window = window
        self.title_label = Text(sstring(self.title, style))
        self.hbox = HBox()
        # self.min_button = Text(sstring("-", style))
        self.max_button = Text(sstring("❑", style))
        self.space = Text(sstring(" ", style))
        self.close_button = Text(sstring("X", style))
        add_child(self.hbox, Text("╭"))
        add_child(self.hbox, self.title_label, stretch="x")
        # add_child(self.hbox, self.min_button)
        
        add_child(self.hbox, self.max_button)
        add_child(self.hbox, self.space)
        add_child(self.hbox, self.close_button)
        add_child(self.hbox, Text("╮"))
        add_child(self, self.hbox)
        
        add_listener(self.title_label, "mousedown", self.on_start_move)
        # add_listener(self.min_button, "click", self.on_min_button_click)
        add_listener(self.max_button, "click", self.on_max_button_click)
        add_listener(self.close_button, "click", self.on_close_button_click)
    
    def set_title(self, title):
        self.title_label.set_text(sstring(title, self.style))    
    
    def on_start_move(self, evt):
        fire_event(self.window, Event("window_move_start", window=self.window, x=evt.x, y=evt.y))
        fire_event(self.window, Event("window_focus", window=self.window))
    
    # def on_min_button_click(self, evt):
    #     fire_event(self.window, Event("minimize", window=self.window))
    
    def on_max_button_click(self, evt):
        fire_event(self.window, Event("maximize", window=self.window))
    
    def on_close_button_click(self, evt):
        fire_event(self.window, Event("close", window=self.window))
    
    def layout(self, constraints):
        defer_layout(self, self.hbox, constraints)
    
    def paint(self):
        defer_paint(self, self.hbox)

class WindowBorder:
    def __init__(self, content, window):
        self.content = content
        self.window = window
        add_child(self, content)
        
    def layout(self, constraints):
        min_width = constraints.min_width
        max_width = constraints.max_width
        min_height = constraints.min_height
        max_height = constraints.max_height
        self.content.layout(BoxConstraints(
            min_width and (min_width - 2),
            max_width and (max_width - 2),
            min_height and (min_height - 1),
            max_height and (max_height - 1)
        ))
        cwidth, cheight = self.content.size
        self.size = (cwidth + 2, cheight + 1)
    
    def paint(self):
        width, height = self.size
        region = self.region
        region.clear_rect(0, 0, width, height)
        for i in range(height - 1):
            region.draw(0, i, "│")
            region.draw(width - 1, i, "│")
        region.draw(0, height - 1, ("╰" + ("─" * (width - 2)) + "╯"))
        
        child_pos = (1, 0)
        self.content.region = region.child_region(child_pos, self.content.size)
        self.content.paint()
    
    def on_mousedown(self, evt):
        x, y = self.region.offset
        width, height = self.size
        if evt.x == x + width - 1 and evt.y == y + height - 1:
            fire_event(self.window, Event(
                "window_resize_start",
                window = self.window,
                direction = "both",
                x = evt.x,
                y = evt.y
            ))
        elif evt.x == x + width - 1:
            fire_event(self.window, Event(
                "window_resize_start",
                window = self.window,
                direction = "x",
                x = evt.x
            ))
        elif  evt.y == y + height - 1:
            fire_event(self.window, Event(
                "window_resize_start",
                window = self.window,
                direction = "y",
                y = evt.y
            ))
        