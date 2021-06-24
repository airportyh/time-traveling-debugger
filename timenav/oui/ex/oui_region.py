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
        for i in range(0, 10):
            for j in range(0, 12):
                region.draw(i, j, sstring("%d" % i, color256(i )))

def main():
    ui = Board()
    
    canvas = MyCanvas()
    add_child(ui, Border(canvas, YELLOW))
    
    run(ui)
    
    
if __name__ == "__main__":
    main()