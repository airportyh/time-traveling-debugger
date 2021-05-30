# Todo
#
# if statements
# label
# text fields
# todo list app

from term_util import *
from oui import *

deModeStack = ["show"]
deFifoQueueOld = []
deFifoQueueNew = []
deRoot = None
deUiContext = []
deClickedElement = None

def deUiContextPush(element):
    global deRoot
    if deRoot is None:
        deRoot = element
    if len(deUiContext) == 0:
        # create root element
        deUiContext.append(element)
    else:
        current = deUiContext[0]
        add_child(current, element)
        deUiContext.insert(0, element)

def deUiContextPop(expectedType):
    assert len(deUiContext) > 0
    assert isinstance(deUiContext[0], expectedType), "%r should be %r" % (deUiContext[0], expectedType)
    del deUiContext[0]

def deVerticalPanel():
    deUiContextPush(VerticalPanel())

def deVerticalPanelEnd():
    deUiContextPop(VerticalPanel)
    
def deButton(text):
    global deClickedElement
    log("deButton(%r)" % text)
    def mouseup(evt):
        global deClickedElement
        deClickedElement = button
        log("Clicked button %r" % text)
    mode = deModeStack[0]
    if mode == "show":
        button = Button(Label(text), mouseup=mouseup)
        deFifoQueueNew.append(("button", text, button))
        add_child(deUiContext[0], button)
    elif mode == "update":
        oldValue = deFifoQueueOld.pop(0)
        button = oldValue[2]
        deFifoQueueNew.append(("button", text, button))
        if ("button", text) == oldValue[0:2]:
            # nothing changed, nothing to do
            pass
        else:
            # update the widget
            button.label.text = text
            button.mouseup = mouseup
        if deClickedElement == button:
            deClickedElement = None
            return True
    elif mode == "erase":
        oldValue = deFifoQueueOld.pop(0)
        button = oldValue[2]
        remove_child(deUiContext[0], button)

# TODO:
# make a todo list

toggle = True

def deContent():
    global toggle
    deVerticalPanel()
    
    if deButton("Click me!"):
        toggle = not toggle

    if toggle:
        deButton("Don't click")
    else:
        deButton("Nice click!")
    
    deVerticalPanelEnd()
    
def deUpdateContent():
    global deFifoQueueNew
    global deFifoQueueOld
    deModeStack[0] = "update"
    deFifoQueueOld = deFifoQueueNew
    deFifoQueueNew = []
    deContent()

def main():
    deContent()
    run(deRoot, deUpdateContent)

if __name__ == "__main__":
    main()    
    