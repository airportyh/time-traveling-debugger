from oui import *

def main():
    root = VerticalPanel()
    split_panel = HorizontalPanel()
    code_pane = VerticalPanel()
    stack_pane = VerticalPanel()
    add_child(stack_pane, Label("n = 6"))
    add_child(stack_pane, Label("a = 3"))
    add_child(stack_pane, Label("b = 5"))
    title = Label("TTD")
    status_bar = Label("Step 123 of 738")

    add_child(code_pane, Label("def fib(n):"))
    add_child(code_pane, Label("    if n == 1 or n == 2:"))
    add_child(code_pane, Label("        return 1"))
    add_child(code_pane, Label("    a = fib(n - 1)"))
    add_child(code_pane, Label("    b = fib(n - 2)"))
    add_child(code_pane, Label("    return a + b"))

    add_child(split_panel, Border(code_pane, "33;1"), stretch="both")
    add_child(split_panel, Border(stack_pane, "36;1"), stretch="both")

    add_child(root, title)
    add_child(root, split_panel, stretch="both")
    add_child(root, status_bar)

    run(root)

if __name__ == "__main__":
    main()