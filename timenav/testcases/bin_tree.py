class BinTree:
    def __init__(self, key, data, left=None, right=None):
        self.key = key
        self.data = data
        self.left = left
        self.right = right

def insert(dest, new_node):
    if new_node.key > dest.key:
        if dest.right:
            insert(dest.right, new_node)
        else:
            dest.right = new_node
    else:
        if dest.left:
            insert(dest.left, new_node)
        else:
            dest.left = new_node

jesse = BinTree("Jesse", "404-384-2345")
jamie = BinTree("Jamie", "770-342-3345")
zander = BinTree("Zander", "843-234-1235")
annie = BinTree("Annie", "392-422-3332")
root = jesse

insert(root, jamie)
insert(root, zander)
insert(root, annie)


    