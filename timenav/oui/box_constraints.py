# Based on Flutter's layout algorithm
# https://blog.nornagon.net/ui-layout-algorithms/
# https://flutter.dev/docs/resources/architectural-overview#layout-and-rendering
# https://www.youtube.com/watch?v=UUfXWzp0-DU
class BoxConstraints:
    def __init__(self, min_width=None, max_width=None, min_height=None, max_height=None):
        self.min_width = min_width
        self.max_width = max_width
        self.min_height = min_height
        self.max_height = max_height
    
    def constrain_width(self, width):
        if self.min_width is not None and width < self.min_width:
            width = self.min_width
        if self.max_width is not None and width > self.max_width:
            width = self.max_width
        return width
    
    def constrain_height(self, height):
        if self.min_height is not None and height < self.min_height:
            height = self.min_height
        if self.max_height is not None and height > self.max_height:
            height = self.max_height
        return height