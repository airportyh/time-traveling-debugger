# Resource: https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
from functools import reduce
import math

CTRL_CODE = "\u001b["

def sstring(string, control_seq):
    if isinstance(string, SStringGroup):
        if string.control_seq:
            return SStringGroup([string], control_seq)
        else:
            return SStringGroup(string.children, control_seq)
    elif isinstance(string, SStringSingle):
        return SStringGroup([string], control_seq)
    elif isinstance(string, str):
        return SStringSingle(string, control_seq)
    else:
        raise Exception("Invalid arguments for sstring")

class SStringSingle(object):
    def __init__(self, string, control_seq):
        self.string = string
        self.control_seq = control_seq
    
    def __repr__(self):
        return "<%s>%s</%s>" % (self.control_seq, self.string, self.control_seq)
    
    def __str__(self):
        return CTRL_CODE + self.control_seq + self.string + CTRL_CODE + "0m"
        
    def __add__(self, other):
        return SStringGroup([self, other])
    
    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                raise Exception("Not supported slices with step")
            else:
                return SStringSingle(self.string[key.start: key.stop], self.control_seq)
        else:
            return SStringSingle(self.string[key], self.control_seq)

    def __len__(self):
        return len(self.string)

class SStringGroup(object):
    def __init__(self, children, control_seq=None):
        self.children = children
        self.control_seq = control_seq
    
    def __repr__(self):
        return "<%s>%s</%s>" % (self.control_seq, "".join(map(repr, self.children)), self.control_seq)
    
    def __str__(self):
        content = "".join(map(str, self.children))
        if self.control_seq:
            return CTRL_CODE + self.control_seq +  + CTRL_CODE + "0m"
        else:
            return content
    
    def __add__(self, other):
        return SStringGroup([self, other])
    
    def __len__(self):
        return reduce(lambda a, b: a + len(b.string), self.children, 0)
    
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
                if stop is None:
                    stop = len(self)
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
                return SStringGroup(results)

        elif isinstance(key, int):
            return self[key:key + 1]
        else:
            raise Exception("Invalid argument type.")
    
