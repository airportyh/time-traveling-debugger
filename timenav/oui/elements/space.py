class Space:
    def layout(self, constraints):
        width = constraints.constrain_width(0)
        height = constraints.constrain_height(0)
        self.size = (width, height)
    
    def paint(self):
        pass