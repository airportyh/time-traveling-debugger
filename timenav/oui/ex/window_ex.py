from oui import *
from oui.elements import *
from sstring import *

def main():
    ui = WindowManager()
    
    box = VBox(same_item_width=True)
    add_child(box, Text("sum = 0"), stretch="x")
    add_child(box, Text("while n < 0:"), stretch="x")
    add_child(box, Text(sstring("   sum += n", REVERSED)), stretch="x")
    add_child(box, Text("   n += 1"), stretch="x")
    
    win1 = Window("Debugger", box)
    ui.add_window(win1,
        abs_pos=(2, 2),
        abs_size=(20, 10)
    )
    
    box2 = VBox(same_item_width=True)
    add_child(box2, Text("Hello, world!"), stretch="x")
    win2 = Window("Program", box2)
    ui.add_window(win2,
        abs_pos=(24, 15)
    )
    run(ui)
    
main()