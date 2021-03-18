class StringTreeGroup(object):
    def __init__(self, contents, separater):
        self.contents = contents
        self.separater = separater

    def __len__(self):
        if self.contents == None:
            return 0
        return len(self.contents)
    
    def __getitem__(self, key):
        return self.contents[key]
    
    def generateLines(self, path, lines):
        for index, child in enumerate(self.contents):
            suffix = self.separater if index != len(self.contents) else ""
            child.generateLines(False, path + [index], lines, suffix)

    def render(self, parentCollapsed):
        separater = self.separater if parentCollapsed else (self.separater + "\n")
        return separater.join(list(map(lambda x: x.render(parentCollapsed), self.contents)))
        

class StringTree(object):
    def __init__(self, data, children, level):
        self.data = data
        self.children = children
        self.level = level
        self.collapsed = False
    
    def __str__(self):
        return self.render(self.collapsed)
    
    def generateLines(self, parentCollapsed, path, lines, suffix):
        collapsed = parentCollapsed or self.collapsed
        lineContent = self.render(collapsed) if collapsed else self.renderSelf(collapsed)
        if lineContent != "":
            lines.append(Line(lineContent + suffix, path[:-1]))
        if not collapsed and self.children:
            self.children.generateLines(path, lines)
    
    def render(self, parentCollapsed):
        collapsed = parentCollapsed or self.collapsed
        selfData = self.renderSelf(collapsed)
        if self.children == None or len(self.children) == 0:
            return selfData
        if selfData == "":
            return self.children.render(collapsed)
        else:
            separater = "" if collapsed else ("\n")
            return selfData + separater + self.children.render(collapsed)

    def renderSelf(self, collapsed):
        indentation = " " if collapsed else " " * self.level
        data = "" if self.data is None else indentation + str(self.data)
        return data
    
    def collapse(self):
        self.collapsed = True
    
    def expand(self):
        self.collapsed = False

class Line(object):
    def __init__(self, content, path):
        self.content = content
        self.path = path
    
        