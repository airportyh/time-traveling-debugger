from oui import *

def main():
    outer_panel = VBox()
    root = Border(outer_panel, "32;1")
    root.stretch = "x"
    split_panel = HBox()
    code_pane = VBox()
    stack_pane = VBox()
    add_child(stack_pane, Text("n = 6"))
    add_child(stack_pane, Text("a = 3"))
    add_child(stack_pane, Text("b = 5"))
    status_bar = Text("Status Bar")

    add_child(code_pane, Text("def fib(n):"))
    add_child(code_pane, Text("    if n == 1 or n == 2:"))
    add_child(code_pane, Text("        return 1"))
    add_child(code_pane, Text("    a = fib(n - 1)"))
    add_child(code_pane, Text("    b = fib(n - 2)"))
    add_child(code_pane, Text("    return a + b"))

    add_child(split_panel, Border(code_pane, "33;1"), stretch="both")
    add_child(split_panel, Border(stack_pane, "36;1"), stretch="both")

    add_child(outer_panel, split_panel, stretch="both")
    add_child(outer_panel, status_bar)

    run(root)

if __name__ == "__main__":
    main()