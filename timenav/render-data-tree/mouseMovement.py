from render import write

def mouse_on():
    write('\x1B[?1000h')

def mouse_off():
    write('\x1B[?1000l')