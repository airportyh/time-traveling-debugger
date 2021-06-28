class Event(object):
    def __init__(self, etype, **kwargs):
        self.type = etype
        self.__dict__.update(kwargs)
    
    def __repr__(self):
        parts = [self.type]
        for attr, value in self.__dict__.items():
            if attr != "type":
                parts.append("%s=%r" % (attr, value))
        return "Evt(%s)" % (" ".join(parts))

def decode_input(an_input):
    events = []
    wheel_events = {}
    if len(an_input) == 1:
        if an_input == '\x7f':
            return [Event("keypress", key = "DEL")]
        elif an_input == '\x1b':
            return [Event("keypress", key = "ESC")]
        return [Event("keypress", key = an_input)]
    # it's not a simple keypress, parse the control sequence
    if an_input == "\x1bOQ":
        return [Event("keypress", key = "F2")]
        
    assert an_input[0:2] == '\x1b['
    while len(an_input) > 0:
        try:
            code = ord(an_input[2])
        except IndexError:
            raise Exception("Unexpected %r" % an_input)
        if code == 77:
            # a mouse event
            mouse_code = ord(an_input[3])
            x = ord(an_input[4]) - 32
            y = ord(an_input[5]) - 32
            
            event_name = {
                32: "mousedown",
                34: "rightmousedown",
                35: "mouseup",
                96: "wheeldown",
                97: "wheelup",
                67: "mousemove",
                64: "mousedrag",
                104: "altwheeldown",
                105: "altwheelup"
            }[mouse_code]
            
            if event_name in ["wheeldown", "wheelup", "altwheeldown", "altwheelup"]:
                key = "%s/%d/%d" % (event_name, x, y)
                if key in wheel_events:
                    event = wheel_events[key]
                    event.amount += 1
                else:
                    event = Event(event_name, x = x, y = y, amount = 1)
                    events.append(event)
                    wheel_events[key] = event
            else:
                event = Event(event_name, x = x, y = y)
                events.append(event)
            an_input = an_input[6:] # there may be multiple mouse events
                                    # consume this one (6 bytes),
                                    # loop back up to handle the rest
        elif code == 65:
            return [Event("keypress", key="UP_ARROW")]
        elif code == 66:
            return [Event("keypress", key="DOWN_ARROW")]
        elif code == 67:
            return [Event("keypress", key="RIGHT_ARROW")]
        elif code == 68:
            return [Event("keypress", key="LEFT_ARROW")]
        elif code == 90:
            return [Event("keypress", key="REVERSE_TAB")]
        else:
            raise Exception("Input control sequence not understood %r" % an_input)
    
    return events