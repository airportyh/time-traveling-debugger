from oui import *

class TodoItem:
    def __init__(self, text, list_ui):
        self.list_ui = list_ui
        self.text = text
        self.panel = HorizontalPanel()
        self.check_box = Text("☐ ")
        self.checked = False
        self.check_box.mouseup = self.on_checkbox_clicked
        add_child(self.panel, self.check_box)
        self.label = Text(text)
        self.label.dblclick = self.on_label_dblclicked
        add_child(self.panel, self.label)
        
        self.del_button = Text(" ⌫ ")
        self.del_button.mouseup = self.on_delete_clicked
        add_child(self.panel, self.del_button)
        
        add_child(self, self.panel)
    
    def on_checkbox_clicked(self, evt):
        self.checked = not self.checked
        display = "☐ " if not self.checked else "☑ "
        self.check_box.set_text(display)
        self.label.set_strikethrough(self.checked)
    
    def on_delete_clicked(self, evt):
        remove_child(self.list_ui, self)
        
    def on_label_dblclicked(self, evt):
        remove_child(self.panel, self.label)
        self.field = TextField(self.text, width=len(self.text), on_keypress=self.on_edit_field_keypress)
        add_child(self.panel, self.field, index=1)
        focus(self.field)
        
    def on_edit_field_keypress(self, evt):
        if evt.key == "\r":
            self.text = self.field.get_text()
            remove_child(self.panel, self.field)
            self.label = Text(self.text)
            self.label.dblclick = self.on_label_dblclicked
            add_child(self.panel, self.label, index=1)
            return False

    def place(self, x, y, max_width, max_height, stretch, level):
        self.panel.place(x, y, max_width, max_height, stretch, level)
        self.x = self.panel.x
        self.y = self.panel.y
        self.width = self.panel.width
        self.height = self.panel.height

def main():
    def on_keypress(evt):
        if evt.key == "\r":
            text = field.get_text()
            item = TodoItem(text, list_ui)
            add_child(list_ui, item)
            field.set_text("")
        
    ui = VerticalPanel()
    
    field = TextField(placeholder="What to do?", width=20, on_keypress=on_keypress)
    add_child(ui, Border(field, "36"))
    
    list_ui = VerticalPanel()
    add_child(ui, Border(list_ui, color="33"))
    
    run(ui)
    
if __name__ == "__main__":
    main()
    