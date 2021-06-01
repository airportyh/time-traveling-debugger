from oui import *

def main():
    outer_panel = VerticalPanel()
    root = Border(outer_panel, "32;1")
    root.stretch = "x"
    split_panel = HorizontalPanel()
    code_pane = VerticalPanel()
    stack_pane = VerticalPanel()
    add_child(stack_pane, Label("n = 6"))
    add_child(stack_pane, Label("a = 3"))
    add_child(stack_pane, Label("b = 5"))
    status_bar = Label("Status Bar")

    add_child(code_pane, Label("def fib(n):"))
    add_child(code_pane, Label("    if n == 1 or n == 2:"))
    add_child(code_pane, Label("        return 1"))
    add_child(code_pane, Label("    a = fib(n - 1)"))
    add_child(code_pane, Label("    b = fib(n - 2)"))
    add_child(code_pane, Label("    return a + b"))

    add_child(split_panel, Border(code_pane, "33;1"), stretch="both")
    add_child(split_panel, Border(stack_pane, "36;1"), stretch="both")

    add_child(outer_panel, split_panel, stretch="both")
    add_child(outer_panel, status_bar)

    run(root)

if __name__ == "__main__":
    main()