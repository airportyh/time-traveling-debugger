import ast
import json

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

def color(string, code):
    return '\u001b[%dm%s\u001b[0m' % (code, string)

if __name__ == "__main__":
    file = open("simple.py")
    code = file.read()
    code_lines = list(map(list, code.split("\n")))
    print(code_lines)
    
    def replace(node, new_code):
        assert node.lineno == node.end_lineno
        line_chars = code_lines[node.lineno - 1]
        length = node.end_col_offset - node.col_offset
        replacement = [new_code] + ([''] * (length - 1))
        print("replacing", line_chars[node.col_offset:node.end_col_offset], "with", replacement)
        assert len(replacement) == len(line_chars[node.col_offset:node.end_col_offset])
        line_chars[node.col_offset:node.end_col_offset] = replacement
    
    def get_code(node):
        assert node.lineno == node.end_lineno
        line_chars = code_lines[node.lineno - 1]
        return "".join(line_chars[node.col_offset:node.end_col_offset])
    
    tree = ast.parse(code)
    json_ast = convert_tree(tree)
    output = open("simple.ast", "w")
    json.dump(json_ast, output, indent = 2)
    output.close()
    for node in reversed(list(ast.walk(tree))):
        if isinstance(node, ast.Name):
            print("ast.Name")
            code = get_code(node)
            print("code", code)
            new_code = color(code, 33)
            print("new code", new_code)
            replace(node, new_code)
        elif isinstance(node, ast.Constant):
            print("ast.Constant")
            replace(node, color(get_code(node), 31))
        elif isinstance(node, ast.Attribute):
            code = get_code(node)
            attr_start = node.end_col_offset - len(node.attr)
            print("part 1", repr(code[0:attr_start]))
            print("part 2", repr(color(code[attr_start:], 36)))
            new_code = code[0:attr_start] + color(code[attr_start:], 36)
            # print("new attr code", new_code)
            print("ast.Attribute")
            replace(node, new_code)
        # elif isinstance(node, ast.FunctionDef):
        #     code = get_code(node)
        #     replace(node, color(code[0:3], 36) + code[3:])
            
    result_code = "\n".join(map(lambda chars: "".join(chars), code_lines))
    print(result_code)