from oui import add_child, defer_layout, defer_paint, add_listener, remove_child, Event, fire_event
from oui import remove_child, get_root, add_listener_once
from oui.elements import VBox, Text, TextField, Border

class GotoStepBar:
    def __init__(self):
        self.vbox = VBox()
        self.label = Text("Go to step:")
        add_child(self.vbox, self.label)
        self.text_field = TextField()
        add_listener(self.text_field, "keypress", self.on_keypress)
        add_child(self.vbox, self.text_field, stretch="x")
        self.border = Border(self.vbox)
        add_child(self, self.border)
        add_listener_once(get_root(), "click", lambda e: self.close())
    
    def on_keypress(self, evt):
        if evt.key == "ESC":
            remove_child(self.parent, self)
            evt.stop_propagation()
        elif evt.key == "\r":
            text = self.text_field.get_text()
            step_num = None
            try:
                step_num = int(text)
            except:
                return
            fire_event(self, Event("select", value=step_num))
    
    def layout(self, constraints):
        defer_layout(self, self.border, constraints)
    
    def paint(self):
        width, height = self.size
        self.region.clear_rect(0, 0, width, height)
        defer_paint(self, self.border)
    
    def close(self):
        remove_child(self.parent, self)