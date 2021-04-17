# Next Steps
#
# * user inputs
# * multiple files
# * colors and formatting
# * integrate styled string
# * try with real-world-ish apps
#   * flask
#   * pygame

import sys
import os
import termios
import tty
import fcntl
import atexit

class Box:
    def __init__(self, left, top, width, height):
        self.left = left
        self.top = top
        self.width = width
        self.height = height

class TextPane:
    def __init__(self, box):
        self.box = box
        self.lines = []
        self.highlighted = None

    def set_lines(self, lines):
        self.lines = lines
        self.render()

    def set_highlight(self, highlighted):
        self.highlighted = highlighted
        self.render()

    def render(self):
        for i in range(self.box.height):
            if i < len(self.lines):
                line = self.lines[i]
            else:
                line = ''
            line = line[0:self.box.width].ljust(self.box.width)
            if self.highlighted == i:
                line = '\u001b[47m\u001b[30m' + line + '\u001b[0m'
            x = self.box.left
            y = self.box.top + i
            goto(x, y)
            write(line)

def display_source(filename, curr_line, code_pane):
    file = open(filename, 'r')
    file_lines = file.readlines()
    file.close()
    gutter_width = len(str(len(file_lines) + 1))

    lines = []
    for i, line in enumerate(file_lines):
        if line[-1] == '\n':
            line = line[0:-1] # get rid of newline at the end
        line = line.replace("\t", "    ")
        lineno = i + 1
        lineno_display = str(i + 1).rjust(gutter_width) + ' '
        line_display = lineno_display + line
        lines.append(line_display)

    code_pane.set_lines(lines)

def display_stack(frame, stack_pane, show_retval, retval):
    lines = []
    
    code = frame.f_code
    func_name = code.co_name
    locals = frame.f_locals
    lines.append("%s()" % func_name)
    for name, value in locals.items():
        lines.append("%s = %r" % (name, value))
    if show_retval:
        lines.append("<ret val> = %r" % retval)
    lines.append("─" * stack_pane.box.width)
    
    curr_frame = frame.f_back
    while curr_frame is not None:
        code = curr_frame.f_code
        func_name = code.co_name
        lines.append("%s()" % func_name)
        locals = curr_frame.f_locals
        for name, value in locals.items():
            lines.append("%s = %r" % (name, value))
        lines.append("─" * stack_pane.box.width)
        curr_frame = curr_frame.f_back
    
    stack_pane.set_lines(lines)

def get_input():
    fl_state = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    data = sys.stdin.read(1)
    if data == '\x1b':
        # temporarily set stdin to non-blocking mode so I can fetch
        # each character that's immediately available
        fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state | os.O_NONBLOCK)
        codes = ""
        while True:
            ch = sys.stdin.read(1)
            if ch == '':
                # reset stdin back to blocking mode
                fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, fl_state)
                break
            else:
                codes += ch
        data += codes
    return data

def write(value):
    print(value, end = '')
    sys.stdout.flush()

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')

def goto(x, y):
    write('\x1B[%d;%df' % (y, x))
    
def frame_height(frame):
    height = 0
    while frame is not None:
        height += 1
        frame = frame.f_back
    return height

class Debugger:
    def __init__(self, code):
        self.code = code
        clear_screen()
        termsize = os.get_terminal_size()
        self.org_settings = termios.tcgetattr(sys.stdin)
        code_pane_width = termsize.columns // 2
        stack_pane_width = termsize.columns - code_pane_width - 1
        code_pane_height = termsize.lines - 1
        stack_pane_height = code_pane_height
        self.code_pane = TextPane(Box(1, 1, code_pane_width, code_pane_height))
        self.status_pane = TextPane(Box(1, termsize.lines, termsize.columns, 1))
        self.stack_pane = TextPane(Box(code_pane_width + 2, 1, stack_pane_width, stack_pane_height))
        self.draw_divider(code_pane_width, code_pane_height)
        tty.setraw(sys.stdin)
        atexit.register(self.restore_term)
        self.source_displayed = False
        self.event_count = 0
        self.target_event_id = None
        self.stepOverUntil = None
        self.backward_over_positions = [0]
    
    def draw_divider(self, code_pane_width, code_pane_height):
        # draw vertical divider line between code pane and stack pane
        for i in range(code_pane_height):
            goto(code_pane_width + 1, i + 1)
            write('┃')
    
    def restore_term(self):
        write('\x1B[0m')
        try:
            termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, self.org_settings)
        except:
            pass
    
    def start(self):
        while True:
            try:
                self.event_count = 0
                self.backward_over_positions = [0]
                sys.settrace(self.intercept)
                exec(self.code, { '__name__': '__main__' })
                break
            except DebugExitRun:
                # execute the code again
                pass
                
    def update_backward_over_positions(self, event):
        if event == 'call':
            self.backward_over_positions.append(self.event_count)
        elif event == 'return':
            self.backward_over_positions.pop()
        else:
            self.backward_over_positions[-1] = self.event_count
    
    def intercept(self, frame, event, arg=None):
        self.event_count += 1
        f_height = frame_height(frame)
        
        if self.stepOverUntil is not None:
            if event == 'call':
                # skip tracking the lines in the call
                self.update_backward_over_positions(event)
                return self.intercept
            elif event in ['line', 'return', 'exception', 'opcode']:
                if self.stepOverUntil == f_height:
                    self.stepOverUntil = None
                    # fall through into UI loop
                else:
                    self.update_backward_over_positions(event)
                    return self.intercept
        elif self.target_event_id is not None:
            if self.event_count == self.target_event_id:
                self.target_event_id = None
                # fall through into UI loop
            else:
                # skip rendering until we hit the target event
                self.update_backward_over_positions(event)
                return self.intercept
        
        # update render of the screen
        code = frame.f_code
        locals = frame.f_locals
        globals = frame.f_globals
        filename = code.co_filename.split("/")[-1]
        func_name = code.co_name
        display_stack(frame, self.stack_pane, event == 'return', arg)
        line_no = frame.f_lineno
        if not self.source_displayed:
            display_source(code.co_filename, line_no, self.code_pane)
            self.source_displayed = True
        self.code_pane.set_highlight(line_no - 1)
        status = "line %d %s() %s (%s)" % (line_no, func_name, filename, event)
        termsize = os.get_terminal_size()
        status = status.center(termsize.columns)
        self.status_pane.set_lines([status])
        self.status_pane.set_highlight(0)
        
        while True:
            answer = get_input()
            data = list(map(ord, answer))
            if data == [27, 91, 66]: # down arrow
                # forward step over
                self.stepOverUntil = frame_height(frame)
                break
            elif data == [27, 91, 65]: # up arrow
                # reverse step over
                self.target_event_id = self.backward_over_positions[-1]
                raise DebugExitRun()
            elif data == [27, 91, 67]: # right arrow
                # forward step into
                break
            elif data == [27, 91, 68]: # left arrow
                # reverse step into
                self.target_event_id = self.event_count - 1
                raise DebugExitRun()
            elif answer == 'q':
                self.restore_term()
                exit()
        
        self.update_backward_over_positions(event)
        
        return self.intercept

class DebugExitRun(Exception):
    pass

if len(sys.argv) < 2:
    print("Please provide a .py file")
else:
    filename = sys.argv[1]
    f = open(filename, 'r')
    code = compile(f.read(), filename, 'exec')
    f.close()
    db = Debugger(code)
    db.start()
    