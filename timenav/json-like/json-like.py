import traceback
import re

def parse(input):
    ws = zeroOrMore(characterMatching("\u0020\u000A\u000D\u0009"))
    character = characterMatching(lambda c: c != '"' and c != '\\')
    characters = zeroOrMore(character)
    string = sequence([literal('"'), characters, literal('"')], lambda data: "".join(data[1]))
    value = choice(lambda: [
        string, 
        literal("true", True), 
        literal("false", False), 
        literal("null", None), 
        array
    ])
    element = sequence([ws, value, ws], lambda data: data[1])
    elements = sequence(
        [
            element, 
            zeroOrMore(
                sequence(
                    [literal(","), element], 
                    lambda data: data[1]
                )
            )
        ], 
        lambda data: [data[0]] + data[1]
    )
    array = choice([
        sequence([literal("["), ws, literal("]")], lambda data: data[1] ),
        sequence([literal("["), elements, literal("]")], lambda data: data[1] )
    ])

    result = element(input, 0)
    if result is not None:
        return result.value
    else:
        raise Exception("No parse found")

class Result(object):
    def __init__(self, value, cursor):
        self.value = value
        self.cursor = cursor


def literal(string, value = None):
    def _literal(buffer, cursor):
        if buffer[cursor : cursor + len(string)] == string:    
            return Result(value if value is not None else string, cursor + len(string))
        else:
            return None
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

def zeroOrMore(parser):
    def _zeroOrMore(buffer, cursor):
        values = []
        currentCursor = cursor
        while True:
            result = parser(buffer, currentCursor)
            if result:
                values.append(result.value)
                currentCursor = result.cursor
            else:
                return Result(values, currentCursor)
    return _zeroOrMore

def characterMatching(match):
    def _characterMatching(buffer, cursor):
        if cursor >= len(buffer):
            return None
        char = buffer[cursor]
        if isinstance(match, str):
            # todo: separate string and regex case
            if re.match(match, char) or char in match:
                return Result(char, cursor + 1)
            else:
                return None
        elif callable(match):
            if match(char):
                return Result(char, cursor + 1)
            else:
                return None
        else:
            raise Exception("Unsupported argument type fo characterMatching: " + choices)
    return _characterMatching

def choice(choices):
    def _choice(buffer, cursor):
        nonlocal choices

        if callable(choices):
            choices = choices()
        for choice in choices:
            result = choice(buffer, cursor)
            if result is not None:
                return result
        return None
    return _choice

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
        # '"ab"',
        # 'true',
        '["a", "b", "c"]',
        '[]',
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
            if output is not None:
                print('"%s" =' % testCase, output)
            else:
                print('"%s" no parse found.' % testCase)
        except Exception: 
            print('error for case "%s"' % testCase)
            print(traceback.format_exc())

test()


