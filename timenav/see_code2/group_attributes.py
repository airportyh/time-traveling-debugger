
def group_attributes(values):
    all_grouped = {}
    for key, value in values.items():
        grouped = all_grouped
        path = key.split(".")[1:]
        num_parts = len(path)
        for i, part in enumerate(path):
            if i == num_parts - 1:
                grouped[part] = value
            else:
                if part not in grouped:
                    grouped[part] = {}
                grouped = grouped[part]
    return all_grouped

def test():
    d = {'.variables.element.__class__': 'WindowManager', '.context': 'add_window(…):window_manager.py', '.variables.event.type': 'add_window'}
    result = group_attributes(d)
    print(result)

if __name__ == "__main__":
    test()
