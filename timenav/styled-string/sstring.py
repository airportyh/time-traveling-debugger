# Resource: https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
from functools import reduce
import math

CTRL_CODE = "\u001b["

def sstring(string, control_seq):
    return StyledStringGroup([StyledString(string, control_seq)])

class StyledString(object):
    def __init__(self, string, control_seq):
        self.string = string
        self.control_seq = control_seq
    
    def __repr__(self):
        return "<%s>%s</%s>" % (self.control_seq, self.string, self.control_seq)
    
    def __str__(self):
        return CTRL_CODE + self.control_seq + self.string + CTRL_CODE + "0m"
    
    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                raise Exception("Not supported slices with step")
            else: 
                return StyledString(self.string[key.start: key.stop], self.control_seq)
        else:
            raise Exception('not implemented yet')

    def __len__(self):
        return len(self.string)

class StyledStringGroup(object):
    def __init__(self, children):
        self.children = children
    
    def __str__(self):
        return "".join(map(str, self.children))
    
    def __add__(self, other):
        return StyledStringGroup(self.children + other.children)
    
    def __len__(self):
        return reduce(lambda a, b: a + len(b.string), self.children, 0)
    
    def __repr__(self):
        return "".join(map(repr, self.children))
    
    def rjust(self, width):
        return " " * self.getPadding(width) + str(self)

    def ljust(self, width):
        return str(self) + " " * self.getPadding(width)

    def center(self, width):
        return " " * (int(math.floor(self.getPadding(width) / 2))) + str(self) + " " * (int(math.ceil(self.getPadding(width) / 2)))
    
    def getPadding(self, width):
        return width - len(self)
    
    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                raise Exception("Not supported slices with step")
            else:
                i = 0
                totalLength = 0
                results = []
                start = key.start
                stop = key.stop
                while True:
                    current = self.children[i]
                    currentLength = len(current)
                    if totalLength + currentLength >= key.start:
                        results.append(current[start:stop])
                    start = max(0, start - currentLength)
                    stop = max(0, stop - currentLength)
                    totalLength += currentLength
                    if start == 0 and stop == 0:
                        break
                    i += 1
                return StyledStringGroup(results)

        elif isinstance(key, int):
            return self[key:key + 1]
        else:
            raise Exception("Invalid argument type.")
    

# class StyledStringGroup(object):
#     def __init__(self, children):
#         self.children = children
# 
#     def __str__(self):
#         return "".join(map(str, self.children))
# 
# class StyledString(object):
#     def __init__(self, string, control_seq):
#         self.string = string
#         self.control_seq = control_seq
# 
#     def __add__(self, other):
#         return StyledStringGroup([self, other])
# 
#     def __getitem__(self, key):
#         if isinstance(key, slice):
#             if slice.step is not None:
#                 raise Exception("Not supported slices with step")
#             else:
#                 pass
#         elif isinstance(key, int):
#             pass
#         else:
#             raise Exception("Invalid argument type.")
# 
#     def __len__(self):
#         pass
# 
#     def __str__(self):
#         return CTRL_CODE + self.control_seq + self.string + CTRL_CODE + "[0m"
# 
#     def rjust(self, width):
#         pass
# 
#     def ljust(self, width):
#         pass
# 
#     def center(self, width):
#         pass
# 
#     def split(self, separator):
#         pass

