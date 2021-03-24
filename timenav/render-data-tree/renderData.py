# How to run:
#     python3 mouseevents.py
#
# Things to try and do:
# 1. Click on different parts of the screen
# 2. Try click-drag-release
# 3. Figure out how to decode the data into coordinate info
# 4. Write code to render a data structure tree to the screen
# 5. Map mouse click coordinates back to a line in the rendered tree
# 6. Allow click events to toggle the collapse state of individual nodes

import sys
import tty
import termios
import fcntl
import os
import traceback
from render import write
from render import goto
from render import clear_screen
from render import get_input
from mouseMovement import mouse_off
from mouseMovement import mouse_on
from dataTree import getLines, getStringTreeRoot, toggleCollapse
from stringTree import StringTreeGroup, StringTree

original_settings = termios.tcgetattr(sys.stdin)

def cleanup():
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_settings)
    print('\x1B[0m')
    mouse_off()

def mapLineToCord(lines):
    offSet = 33
    x = 1
    y = 1
    mouseX = offSet
    mouseY = offSet
    results = []
    for line in lines:
        result = {}
        result['content'] = line.content
        result['path'] = line.path
        result['cordX'] = x
        result['cordY'] = y
        result['cordXMouse'] = mouseX
        result['cordYMouse'] = mouseY
        results.append(result)
        y += 1
        mouseY += 1
    return results

def getCordToPathDict(lines):
    results = {}
    for line in lines:
        key = getKey(line['cordXMouse'], line['cordYMouse'])
        results[key] = line['path']
    return results


def getKey(x, y):
    return "{x} | {y}".format(x = x, y = y)


def render(data):
    clear_screen()
    mouse_on()

    tty.setraw(sys.stdin)
    try:
        size = os.get_terminal_size()
        tree = getStringTreeRoot(data)
        lines = []
        tree.generateLines(False, [], lines, "")
        lineInfo = mapLineToCord(lines)
        cordToPathDict = getCordToPathDict(lineInfo)
        for line in lineInfo:
            goto(line['cordX'], line['cordY'])
            print(line['content'])
        while True:
            userInput = get_input()
            if userInput == 'q':
                break
            goto(1, 1)

            userInput = list(map(ord, userInput))
            key = getKey(str(userInput[4]), str(userInput[5]))
            if isinstance(cordToPathDict.get(key), list) and userInput[3] == 32:
                toggleCollapse(tree, cordToPathDict[key])
                clear_screen()
                mouse_on()
                lines = []
                tree.generateLines(False, [], lines, "")
                lineInfo = mapLineToCord(lines)
                cordToPathDict = getCordToPathDict(lineInfo)
                for line in lineInfo:
                    goto(line['cordX'], line['cordY'])
                    print(line['content'])
                
    except Exception as e:
        cleanup()
        traceback.print_tb(e)

    cleanup()

render([[1, 2], [3, 4]])

