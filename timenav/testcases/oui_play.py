import sys
import os.path
parent_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
sys.path.append(parent_dir)
from oui import *
from oui.elements import *
from sstring import *

class MyCanvas:
    def layout(self, constraints):
        width = constraints.constrain_width(10)
        height = constraints.constrain_height(10)
        self.size = (width, height)
    
    def paint(self, pos):
        self.pos = pos
        region = Region(pos, self.size)
        for i in range(0, 20):
            for j in range(0, 20):
                region.draw(i - 5, j - 5, sstring("%d" % (i % 10), color256(i + 1)))

def main():
    ui = Board()
    
    canvas = MyCanvas()
    border = Border(canvas, "36;1")
    border.pos = (10, 5)
    add_child(ui, border)
    
    run(ui)
    
    
if __name__ == "__main__":
    main()