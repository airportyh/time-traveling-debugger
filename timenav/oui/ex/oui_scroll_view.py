from sstring import *
from oui import *
from oui.elements import *

def main():
    file = open("testcases/odyseey.txt")
    lines = file.readlines()[0:500]
    
    for i, line in enumerate(lines):
        if line.endswith("\n"):
            lines[i] = line[0:-1]
    list_ui = VBox()
    for line in lines:
        add_child(list_ui, Text(line))
    scroll_view = ScrollView(list_ui)
    # scroll_view.offset = (8, 0)
    border = Border(scroll_view, color="33")
    border.pos = (5, 3)
    ui = border
    run(ui)
    
if __name__ == "__main__":
    main()
    