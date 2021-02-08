import ast
import json
import sys

def is_simple(node):
    return isinstance(node, str) or isinstance(node, int)\
        or isinstance(node, bool) or isinstance(node, float)

def convert_tree(node):
    if is_simple(node):
        return node
    if isinstance(node, list):
        return list(map(convert_tree, node))
    type_name = type(node).__name__
    attrs = dir(node)
    json = { 'type': type_name }
    for attr in attrs:
        if not attr.startswith("_"):
            json[attr] = convert_tree(getattr(node, attr))
    return json

if __name__ == "__main__":
    code = sys.stdin.read()
    tree = ast.parse(code)
    print(json.dumps(convert_tree(tree), indent=4))