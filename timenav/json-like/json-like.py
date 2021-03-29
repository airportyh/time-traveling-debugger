import traceback

def parse(input):
    string = sequence([literal('"', None), literal(input, None), literal('"', None)], lambda data: data[1])
    # element = sequence([literal(input, None)], getFirstFromValues)
    result = string(input, 0)
    return result.value

def getFirstFromValues(values):
    return values[0]

class Result(object):
    def __init__(self, value, cursor):
        self.value = value
        self.cursor = cursor


def literal(string, value):
    def _literal(buffer, cursor):
        nonlocal value
        if value is None:
            value = string
        return Result(value, cursor + len(string))
    return _literal

def sequence(parsers, converter):
    def _sequence(buffer, cursor):
        values = []
        currentCursor = cursor
        for parser in parsers:
            result = parser(buffer, currentCursor)
            if result is not None:
                values.append(result.value)
                currentCursor = result.cursor
            else:
                return None
        value = converter(values) if converter is not None else values
        return Result(value, currentCursor)
    return _sequence

def test(): 
    testCases = [
        # "-1.2",
        # "5",
        # "123",
        # "-12",
        # "-6",
        # "12.50",
        # "-5.6",
        # "12.5e10",
        # "4e5",
        "ab",
        # "[1, 2.5, -0.5]",
        # "[1,2.5,-0.5]",
        # "[1,2.5-0.5]",
        # '"abcde"',
        # '"abc\tde"',
        # '"\\u1234"',
        # "{}",
        # '{"a": 1}',
        # '{"a": 1, "b": 2}',
        # '{"hello": true, "world": false, "yo": null}',
        # '[{ "name": "jerry", "friends": [ {"name": "shanda"} ] }]',
        # '{ {"id": 1}: "brown" }',
        # '{ *123456: ^1234 }',
        # '{ "funCall": 2, "variables": *215}',
        # '<tuple>[1, 2]',
        # '<tuple>[]',
        # '<set>[]',
        # '<function>{}',
        # '<Point>{ "x": 1, "y": 2 }',
        # '^123'
    ]

    for testCase in testCases:
        try:
            output = parse(testCase)
            if output:
                print('"%s" =' % testCase, output)
            else:
                print('"%s" no parse found.' % testCase)
        except Exception: 
            print('error for case "%s"' % testCase)
            print(traceback.format_exc())

test()


