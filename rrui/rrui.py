from pygdbmi.gdbcontroller import GdbController
import os
import fcntl
import sys
import traceback
import termios
import tty

gdb = GdbController(['rr', 'replay', '--', '--interpreter=mi3'])

class Box:
	def __init__(self, left, top, width, height):
		self.left = left
		self.top = top
		self.width = width
		self.height = height

class TextPane:
	def __init__(self, box=None):
		self.box = box
		self.lines = []
		self.highlighted = None
		
	def set_box(self, box):
		self.box = box
		self.render()

	def set_lines(self, lines):
		self.lines = lines
		self.render()

	def set_highlight(self, highlighted):
		self.highlighted = highlighted
		self.render()

	def render(self):
		if self.box is None:
			return
		for i in range(self.box.height):
			if i < len(self.lines):
				line = self.lines[i]
			else:
				line = ''
			line = line.ljust(self.box.width)
			if self.highlighted == i:
				line = '\u001b[47m\u001b[30m' + line + '\u001b[0m'
			x = self.box.left
			y = self.box.top + i
			goto(x, y)
			print(line, end='')
			
class SplitPane:
	def __init__(self, box, direction, children):
		self.box = box
		self.direction = direction # 'vertical' or 'horizontal'
		self.children = children

def write(value):
    print('\x1B' + value, end = '')
    sys.stdout.flush()

def clear_screen():
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')

def goto(x, y):
	write('[%d;%df' % (y, x))

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

def perform(cmd):
	responses = gdb.write(cmd)
	return responses

def display_source(filename, curr_line, code_pane):
	file = open(filename, 'r')
	file_lines = file.readlines()
	file.close()
	gutter_width = len(str(len(file_lines) + 1))

	lines = []
	for i, line in enumerate(file_lines):
		line = line[0:-1] # get rid of newline at the end
		line = line.replace("\t", "    ")
		lineno = i + 1
		lineno_display = str(i + 1).rjust(gutter_width) + ' '
		line_display = lineno_display + line
		lines.append(line_display)

	code_pane.set_lines(lines)

def initialize(code_pane):
	clear_screen()
	perform('-break-insert main')
	perform('-exec-continue')
	results = perform('1-thread-info')
	result = next(filter(lambda r: r['type'] == 'result', results))
	frame = result['payload']['threads'][0]['frame']
	filename = frame['fullname']
	lineno = int(frame['line'])
	func = frame['func']
	display_source(filename, lineno, code_pane)
	code_pane.set_highlight(lineno - 1)

def restore_term(settings):
	termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, settings)

def get_result(results):
	result = next(filter(lambda r: r['type'] == 'result', results))
	return result

def show_locals(stack_pane):
	lines = []
	frames_result = get_result(perform('-stack-list-frames'))
	frames = frames_result['payload']['stack']
	for frame in frames:
		func = frame['func']
		lines.append("\u001b[4m%s()\u001b[0m" % func)
		vars_result = get_result(
			perform('-stack-list-variables --thread 1 --frame %s --simple-values' % frame['level']))
		vars = vars_result['payload']['variables']
		for i, var in enumerate(vars):
			value = var.get('value', None)
			var_display = "  %s: %s = %s" % (var['name'], var['type'], value)
			lines.append(var_display)

	stack_pane.set_lines(lines)

def main():
	termsize = os.get_terminal_size()
	code_pane_width = termsize.columns // 2
	stack_pane_left = code_pane_width + 1
	stack_pane_width = termsize.columns - code_pane_width
	log_pane_height = 5
	code_pane_height = termsize.lines - log_pane_height
	stack_pane_height = code_pane_height

	code_pane = TextPane(Box(1, 1, code_pane_width, code_pane_height))
	stack_pane = TextPane(Box(stack_pane_left, 1, stack_pane_width, stack_pane_height))
	log_pane = TextPane(Box(1, code_pane_height + 1, termsize.columns, log_pane_height))

	org_settings = termios.tcgetattr(sys.stdin)
	try:
		tty.setraw(sys.stdin)
		initialize(code_pane)
		show_locals(stack_pane)
		while True:
			answer = get_input()
			if answer == 'q':
				break
			data = list(map(ord, answer))
			if data == [27, 91, 66]: # down arrow
				results = perform('-exec-next')
			elif data == [27, 91, 65]: # up arrow
				results = perform('-exec-next --reverse')
			elif data == [27, 91, 67]: # right arrow
				results = perform('-exec-step')
			elif data == [27, 91, 68]: # left arrow
				results = perform('-exec-step --reverse')
			else:
				log_pane.set_lines([("Data: %s" % repr(data)).center(termsize.columns)])
				continue

			for result in results:
				if result['type'] == 'notify' and result['message'] == 'stopped':
					frame = result['payload']['frame']
					filename = frame['fullname']
					func = frame['func']
					lineno = int(frame['line'])
					code_pane.set_highlight(lineno - 1)
					show_locals(stack_pane)
					frame_display = repr(result['payload']['frame'])
					log_pane.set_lines([
						("Data: %s" % repr(data)).center(termsize.columns),
						("%s %s() line %d" % (filename, func, lineno)).center(termsize.columns),
						frame_display
					])

	except Exception as e:
		restore_term(org_settings)
		traceback.print_exc()

	restore_term(org_settings)

main()
