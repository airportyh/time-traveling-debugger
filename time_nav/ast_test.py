import ast

m = ast.parse("a + b")

if __name__ == "__main__":
    for node in ast.walk(m):
        print(node)
        for attr in ("end_lineno", "end_col_offset"):
            if hasattr(node, attr):
                print(f"{node} - {attr} = {getattr(node, attr)}")
