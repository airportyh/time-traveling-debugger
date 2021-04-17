from stringTree import StringTree, StringTreeGroup

def render(data):
    stringTree = getStringTreeRoot(data)
    print(str(stringTree))

def getStringTreeRoot(data):
    return getStringTree(data, 0, "")

def getStringTree(data, level, prefix):
    if isinstance(data, list):
        children = list(map(lambda x: getStringTree(x, level + 1, ""), data))
        stringTree = StringTree(None, StringTreeGroup([
            StringTree("[", StringTreeGroup(children, ","), level), 
            StringTree("]", None, level), 
        ], ""), level)
    elif isinstance(data, dict):
        results = []
        for key, value in data.items():
            results.append(getStringTree(value, level + 1, key + ": "))
        stringTree = StringTree(None, StringTreeGroup([
            StringTree(prefix + "{", StringTreeGroup(results, ","), level), 
            StringTree("}", None, level), 
        ], ""), level)
    else:
        stringTree = StringTree(prefix + str(data), None, level)
    return stringTree

def getLines(tree):
    return str(tree).split('\n')

def toggleCollapse(stringTree, path):
    target = stringTree
    for item in path:
        children = target.children.contents
        target = children[item]
    if target.collapsed:
        target.expand()
    else:
        target.collapse()
    

# render(1)
# render("Hello")
# render(True)
# render(False)
# render(None)
# render([1, 2, 3, 4])
# render([[1, 2], [3, 4]])
# render([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
# render([[[[1, 2], [3, 4]], [[1, 2], [3, 4]]], [[[1, 2], [3, 4]], [[1, 2], [3, 4]]]])
# render({ "a": 1, "b": 2, "c": 3, "d": 4 })
# render({ "a": {"c": 1, "d": 2}, "b": 2})
# render({ "a": [1, 2], "b": 2})