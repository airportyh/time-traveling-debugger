# TODO

# * maybe more styles from yaytext.com

# * style constants (done)
# * equality (ok if slow) (done)
# * center (done)
# * ljust (done)
# * rjust (done)
# * strikethrough (done)
# * multiple control codes (done)
# * bug with nesting (done)
# * nesting (done)
# * convert to string (done)
# * len (done)
# * indexing (done)
# * slicing (done)
# * concatenation (done)

# Resource: https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
from functools import reduce
import math

CTRL_CODE = "\u001b["

BLACK = "30m"
RED = "31m"
GREEN = "32m"
YELLOW = "33m"
BLUE = "34m"
MAGENTA = "35m"
CYAN = "36m"
WHITE = "37m"
BRIGHT_BLACK = "30;1m"
BRIGHT_RED = "31;1m"
BRIGHT_GREEN = "32;1m"
BRIGHT_YELLOW = "33;1m"
BRIGHT_BLUE = "34;1m"
BRIGHT_MAGENTA = "35;1m"
BRIGHT_CYAN = "36;1m"
BRIGHT_WHITE = "37;1m"
BG_BLACK = "40m"
BG_RED = "41m"
BG_GREEN = "42m"
BG_YELLOW = "43m"
BG_BLUE = "44m"
BG_MAGENTA = "45m"
BG_CYAN = "46m"
BG_WHITE = "47m"
BG_BRIGHT_BLACK = "40;1m"
BG_BRIGHT_RED = "41;1m"
BG_BRIGHT_GREEN = "42;1m"
BG_BRIGHT_YELLOW = "43;1m"
BG_BRIGHT_BLUE = "44;1m"
BG_BRIGHT_MAGENTA = "45;1m"
BG_BRIGHT_CYAN = "46;1m"
BG_BRIGHT_WHITE = "47;1m"
BOLD = "1m"
UNDERLINE = "4m"
REVERSED = "7m"

empty_unicode_chars = set([
    u"\ufe0e", u"\ufeff", u"\ufe00", u"\ufe01", u"\ufe02", u"\ufe03", u"\ufe04",
    u"\ufe05", u"\u2060", u"\u200D", u"\u2060", u"\ufe06", u"\ufe07", u"\ufe08",
    u"\ufe09", u"\ufe0A", u"\ufe0B", u"\ufe0C", u"\ufe0D", u"\ufe0E", u"\ufe0F",
])

def filter_empty_chars(string):
    return "".join(filter(lambda c: c not in empty_unicode_chars, list(string)))

def color256(color_code):
    return "38;5;%dm" % color_code

def sstring(string, codes=[], strike_through=False):
    if isinstance(string, SStringSingle):
        return SStringGroup([string], codes, strike_through)
    elif isinstance(string, SStringGroup):
        if string.codes and not string.strike_through:
            return SStringGroup([string], codes, strike_through)
        else:
            # save a level of nesting if the input doesn't have a code
            return SStringGroup(string.children, codes, strike_through)
    elif isinstance(string, str):
        return SStringSingle(filter_empty_chars(string), codes, strike_through)
    else:
        raise Exception("Invalid arguments for sstring")

class SStringSingle:
    def __init__(self, string, codes=[], strike_through=False):
        self.string = string
        self.codes = codes
        if isinstance(self.codes, str):
            self.codes = [self.codes]
        self.strike_through=strike_through
    
    def __repr__(self):
        return _render_repr(self, self.string)
    
    def __str__(self):
        return self.render([], False)
            
    def render(self, parent_codes, parent_strike_through):
        codes = parent_codes + self.codes
        st = parent_strike_through or self.strike_through
        if len(codes) > 0 or st:
            code_seqs = "".join(map(lambda code: CTRL_CODE + code, codes))
            string = self.string
            if st:
                string = _strike_through(string)
            return code_seqs + string + CTRL_CODE + "0m"
        else:
            return self.string
        
    def __add__(self, other):
        assert isinstance(other, SStringGroup) or isinstance(other, SStringSingle)
        if isinstance(other, SStringSingle) and same_styles(self, other):
            # optimization: merge into one SStringSingle
            return SStringSingle(self.string + other.string, self.codes, self.strike_through)
        return SStringGroup([self, other])
    
    def __mul__(self, times):
        assert isinstance(times, int)
        return sstring(self.string * times, codes=self.codes, strike_through=self.strike_through)
    
    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                raise Exception("Slices with step is not supported")
            else:
                return SStringSingle(self.string[key.start:key.stop], self.codes, self.strike_through)
        else:
            return SStringSingle(self.string[key], self.codes, self.strike_through)

    def ljust(self, width, fillchar=' '):
        return SStringSingle(self.string.ljust(width, fillchar), self.codes, self.strike_through)
    
    def rjust(self, width, fillchar=' '):
        return SStringSingle(self.string.rjust(width, fillchar), self.codes, self.strike_through)
    
    def center(self, width, fillchar=' '):
        return SStringSingle(self.string.center(width, fillchar), self.codes, self.strike_through)

    def __eq__(self, other):
        return repr(self) == repr(other)

    def __len__(self):
        return len(self.string)

class SStringGroup:
    def __init__(self, children, codes=[], strike_through=False):
        self.children = children
        self.codes = codes
        if isinstance(self.codes, str):
            self.codes = [self.codes]
        self.strike_through = strike_through
    
    def __repr__(self):
        content = "".join(map(repr, self.children))
        return _render_repr(self, content)
    
    def __str__(self):
        return self.render([], False)
    
    def render(self, parent_codes, parent_strike_through):
        codes = parent_codes + self.codes
        st = parent_strike_through or self.strike_through
        return "".join(map(lambda child: child.render(codes, st), self.children))
    
    def __add__(self, other):
        assert isinstance(other, SStringGroup) or isinstance(other, SStringSingle)
        if same_styles(self, other):
            return SStringGroup(self.children + [other], self.codes, self.strike_through)
        return SStringGroup([self, other])
    
    def __mul__(self, times):
        assert isinstance(times, int)
        result = sstring("")
        for i in range(times):
            result += self
        return result
    
    def __len__(self):
        return reduce(lambda a, b: a + len(b), self.children, 0)
    
    def ljust(self, width, fillchar=' '):
        padding = self.getPadding(width)
        if padding <= 0:
            return self
        last_child = self.children[-1]
        return SStringGroup(self.children + [
            SStringSingle(fillchar * padding, 
                last_child.codes, 
                last_child.strike_through
            )
        ], self.codes, self.strike_through)

    def rjust(self, width, fillchar=' '):
        padding = self.getPadding(width)
        if padding <= 0:
            return self
        first_child = self.children[0]
        return SStringGroup([
            SStringSingle(fillchar * padding, 
                first_child.codes, 
                first_child.strike_through
            )
        ] + self.children, self.codes, self.strike_through)

    def center(self, width, fillchar=' '):
        padding = self.getPadding(width);
        if padding <= 0:
            return self
        first_child = self.children[0]
        front_padding = padding // 2
        last_child = self.children[1]
        back_padding = padding - front_padding
        return SStringGroup([
            SStringSingle(fillchar * front_padding,
                first_child.codes,
                first_child.strike_through
            )
        ] + self.children + [
            SStringSingle(fillchar * back_padding,
                last_child.codes,
                last_child.strike_through
            )
        ], self.codes, self.strike_through)
        
        return " " * (
            int(math.floor(self.getPadding(width) / 2))) + str(self) + \
            " " * (int(math.ceil(self.getPadding(width) / 2))
        )
    
    def getPadding(self, width):
        return width - len(self)
    
    def __eq__(self, other):
        return repr(self) == repr(other)

    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                raise Exception("Slices with step is not supported")
            else:
                i = 0
                results = []
                start = key.start
                stop = key.stop
                if stop is None:
                    stop = len(self)
                while True:
                    if i >= len(self.children):
                        break
                    current = self.children[i]
                    if start < len(current):
                        result = current[start:stop]
                        results.append(result)
                    start = max(0, start - len(current))
                    stop = max(0, stop - len(current))
                    if start == 0 and stop == 0:
                        break
                    i += 1
                if len(results) == 0:
                    return sstring("")
                return reduce(lambda a, b: a + b, results)

        elif isinstance(key, int):
            return self[key:key + 1]
        else:
            raise Exception("Invalid argument type.")

def same_styles(one, other):
    return one.strike_through == other.strike_through and one.codes == other.codes

def _render_repr(ss, content):
    if len(ss.codes) > 0 or ss.strike_through:
        code_list = ",".join(ss.codes)
        if ss.strike_through:
            code_list += "-"
        return "<%s>%s</%s>" % (code_list, content, code_list)
    else:
        return content

def _strike_through(s):
    # https://stackoverflow.com/a/53836006/5304
    result = ""
    for char in s:
        result += char + "\u0336"
    return result