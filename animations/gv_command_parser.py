# See https://www.graphviz.org/docs/outputs/canon/
def parse(input):
    i = 0
    
    def read_token():
        nonlocal i
        starti = i
        while True:
            ii = i
            inp = input
            if i >= len(input):
                token = input[starti:]
                return token
            if input[i] == " ":
                token = input[starti:i]
                i += 1
                return token
            else:
                i += 1
    
    def read_string_bytes(num_bytes):
        nonlocal i
        assert input[i] == "-"
        i += 1
        string = input[i:i + num_bytes]
        i += num_bytes
        ii = i
        inp = input
        if i < len(input):
            assert input[i] == " "
            i += 1
        return string
    
    commands = []
    
    while i < len(input):
        token = read_token()
        if token == "c": # stroke color
            num_bytes = int(read_token())
            string = read_string_bytes(num_bytes)
            commands.append(("c", string))
        elif token == "C": # fill color
            num_bytes = int(read_token())
            string = read_string_bytes(num_bytes)
            commands.append(("C", string))
        elif token == "S": # style
            num_bytes = int(read_token())
            string = read_string_bytes(num_bytes)
            commands.append(("S", string))
        elif token == "B": # b-spline
            num_points = int(read_token())
            points = []
            for j in range(num_points):
                x = float(read_token())
                y = float(read_token())
                points.append((x, y))
            commands.append(("B", points))
        elif token == "P": # polygon
            num_points = int(read_token())
            points = []
            for j in range(num_points):
                x = float(read_token())
                y = float(read_token())
                points.append((x, y))
            commands.append(("P", points))
        elif token == "L": # polyline
            num_points = int(read_token())
            points = []
            for j in range(num_points):
                x = float(read_token())
                y = float(read_token())
                points.append((x, y))
            commands.append(("L", points))
        elif token == "F": # font
            points = int(read_token())
            num_bytes = int(read_token())
            font_name = read_string_bytes(num_bytes)
            commands.append(("F", points, font_name))
        elif token == "T": # text
            x = float(read_token())
            y = float(read_token())
            j = int(read_token())
            w = float(read_token())
            num_bytes = int(read_token())
            text = read_string_bytes(num_bytes)
            commands.append(("T", x, y, j, w, text))
        else:
            raise Exception("Unhandled")
    
    return commands

def test():
    ex1 = "c 7 -#000000 B 7 53.48 83.44 43.54 72.55 31.45 59.17 20.8 47 16.82 42.45 12.47 37.31 8.94 33.09 "
    ex2 = "S 5 -solid c 7 -#000000 C 7 -#000000 P 3 11.6 30.82 2.51 25.37 6.22 35.29 "
    ex3 = "c 7 -#000000 B 4 77.08 83.37 78.3 75.15 79.7 65.66 81.03 56.73 "
    ex4 = "F 14 11 -Times-Roman c 7 -#000000 T 272.8 31.3 0 21 3 -Sue F 14 11 -Times-Roman c 7 -#000000 T 272.8 8.3 0 70 11 -834-234-345 "
    ex5 = "F 14 11 -Times-Roman c 7 -#000000 T 85.8 31.3 0 37 5 -Donny F 14 11 -Times-Roman c 7 -#000000 T 85.8 8.3 0 77 12 -832-345-2345 "
    ex6 = "c 7 -#000000 B 25 51.3 0.5 51.3 0.5 120.3 0.5 120.3 0.5 126.3 0.5 132.3 6.5 132.3 12.5 132.3 12.5 132.3 34.5 132.3 34.5 132.3 40.5 \
    126.3 46.5 120.3 46.5 120.3 46.5 51.3 46.5 51.3 46.5 45.3 46.5 39.3 40.5 39.3 34.5 39.3 34.5 39.3 12.5 39.3 12.5 39.3 6.5 45.3 0.5 \
    51.3 0.5 c 7 -#000000 L 2 39.3 23.5 132.3 23.5 "

    assert parse("c 7 -#000000") == [('c', '#000000')]
    assert parse("S 5 -solid") == [('S', 'solid')]
    assert parse("S 5 -solid c 7 -#000000") == [('S', 'solid'), ('c', '#000000')]
    assert parse("B 4 77.08 83.37 78.3 75.15 79.7 65.66 81.03 56.73") == [("B", [(77.08, 83.37), (78.3, 75.15), (79.7, 65.66), (81.03, 56.73)])]
    assert parse("P 3 11.6 30.82 2.51 25.37 6.22 35.29 ") == [("P", [(11.6, 30.82), (2.51, 25.37), (6.22, 35.29)])]
    assert parse("F 14 11 -Times-Roman") == [("F", 14, "Times-Roman")]
    assert parse("T 272.8 31.3 0 21 3 -Sue") == [("T", 272.8, 31.3, 0, 21, "Sue")]
    print(parse(ex1))
    print(parse(ex2))
    print(parse(ex3))
    print(parse(ex4))
    print(parse(ex5))
    print(parse(ex6))