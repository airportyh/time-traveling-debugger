class Event(object):
    def __init__(self, etype, **kwargs):
        self.type = etype
        self.__dict__.update(kwargs)
    
    def __repr__(self):
        parts = [self.type]
        for attr, value in self.__dict__.items():
            if attr != "type":
                parts.append("%s=%s" % (attr, value))
        return "Evt(%s)" % (" ".join(parts))

def decode_input(an_input):
    events = []
    codes = list(map(ord, an_input))
    while len(codes) > 0:
        if codes[0:3] == [27, 91, 77]:
            # mouse event
            if codes[3] == 32:
                event = Event("mousedown", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 35:
                x = codes[4] - 32
                y = codes[5] - 32
                event = Event("mouseup", x = x, y = y)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 96:
                event = Event("wheeldown", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 97:
                event = Event("wheelup", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 67:
                event = Event("mousemove", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 64:
                event = Event("mousedrag", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 104:
                event = Event("ctrlwheeldown", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            elif codes[3] == 105:
                event = Event("ctrlwheelup", x = codes[4] - 32, y = codes[5] - 32)
                events.append(event)
                codes = codes[6:]
            else:
                raise Exception("Unknown mouse control code %r" % codes)
        else:
            # don't understand
            break
    return events