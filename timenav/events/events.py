import time

class Event(object):
    def __init__(self, etype, **kwargs):
        self.type = etype
        self.__dict__.update(kwargs)
        self.propagation_stopped = False
        self.immediate_propagation_stopped = False
    
    def stop_propagation(self):
        self.propagation_stopped = True
    
    def stop_immediate_propagation(self):
        self.immediate_propagation_stopped = True
        self.propagation_stopped = True
    
    def __repr__(self):
        parts = [self.type]
        for attr, value in self.__dict__.items():
            if attr != "type":
                parts.append("%s=%r" % (attr, value))
        return "Evt(%s)" % (" ".join(parts))

max_click_gap = 0.250
max_dbl_click_gap = 0.5
prev_mousedown = None
prev_mousedown_tick = None
prev_click = None
prev_click_tick = None

def decode_input(an_input, offset=(32, 32)):
    global prev_mousedown
    global prev_mousedown_tick
    global prev_click
    global prev_click_tick
    offsetx, offsety = (offset)
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
            
            x = ord(an_input[4]) - offsetx
            y = ord(an_input[5]) - offsety
            
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
                if event.type == "mouseup":
                    if prev_mousedown and (time.time() - prev_mousedown_tick < max_click_gap):
                        if event.x == prev_mousedown.x and event.y == prev_mousedown.y:
                            click_event = Event("click", x=event.x, y=event.y)
                            events.append(click_event)
                            prev_mousedown = None
                            prev_mousedown_tick = None
                            if prev_click and (time.time() - prev_click_tick < max_dbl_click_gap):
                                if click_event.x == prev_click.x and click_event.y == prev_click.y:
                                    dbl_click_event = Event("dblclick", x=click_event.x, y=click_event.y)
                                    events.append(dbl_click_event)
                                    prev_click = None
                                    prev_click_tick = None
                            prev_click = click_event
                            prev_click_tick = time.time()
                elif event.type == "mousedown":
                    prev_mousedown = event
                    prev_mousedown_tick = time.time()
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