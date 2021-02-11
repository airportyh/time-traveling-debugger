function Ref(id) {
    this.id = id;
}
exports.Ref = Ref;

function HeapRef(id) {
    this.id = id;
}
exports.HeapRef = HeapRef;

function parse(input) {
    
    const refDict = {};

    let digit = characterMatching("0123456789");
    let digits = oneOrMore(digit);
    let oneNine = characterMatching("123456789");
    let integer = choice([
        sequence([literal("-"), oneNine, digits], (data) => "-" + data[1] + data[2]), 
        sequence([literal("-"), digit], (data) => "-" + data[1]), 
        sequence([oneNine, digits], (data) => data[0] + data[1]), 
        digit
    ], (data) => Number(data.join("")));
    let sign = choice([literal("-"), nothing("")]);
    let exponent = choice([
        sequence([characterMatching("eE"), sign, digits], (data) => "e" + data[1] + data[2]), 
        nothing("")
    ]);
    let fraction = choice([
        sequence([literal("."), digits], (data) => "." + data[1]), 
        nothing("")
    ]);
    let number = sequence([integer, fraction, exponent], (data) => Number(data.join("")));
    let ws = zeroOrMore(characterMatching("\u0020\u000A\u000D\u0009"));
    let hex = characterMatching("0123456789abcdefABCDEF");
    let escape = choice([characterMatching('"\\\/bfnrt'), sequence([literal("u"), hex, hex, hex, hex])]);
    let character = choice([sequence([literal("\\"), escape]), characterMatching((c) => c !== '"' && c !== '\\')]);
    let characters = zeroOrMore(character);
    let string = sequence([literal('"'), characters, literal('"')], (data) => {
        return data[1].join("");
    });
    let identifier = sequence([characterMatching(/[a-zA-Z_]/), zeroOrMore(characterMatching(/[a-zA-Z_0-9.]/))],
        (data) => data[0] + data[1].join(""));
    let tag = sequence([literal("<"), identifier, literal(">")], (data) => data[1]);
    let nonEmptyArray = sequence(() => [zeroOrOne(tag), literal("["), elements, literal("]")], (data) => {
        if (data[0] === "[") {
            // no tag
            return data[1];
        } else {
            // has tag
            const array = data[2];
            array.__tag__ = data[0][0];
            return array;
        }
    });
    let emptyArray = sequence([zeroOrOne(tag), literal("["), ws, literal("]")], (data) => {
        let array = [];
        if (data[0] !== "[") {
            // has tag
            array.__tag__ = data[0][0];
        }
        return array;
    });
    let array = choice([emptyArray, nonEmptyArray], (data) => data[0]);
    let value = choice(() => [
        array, 
        object, 
        string, 
        number,
        literal("true", true),
        literal("false", false),
        literal("null", null),
        ref,
        heapRef,
    ], (data) => data[0]);
    let element = sequence([ws, value, ws], (data) => data[1]);
    let elements = sequence(() => [
        element, 
        zeroOrMore(sequence([literal(","), element], (data) => data[1]))
    ], (data) => [data[0], ...data[1]]);
    let object = choice([
        sequence([zeroOrOne(tag), literal("{"), ws, literal("}")], (data) => {
            let map = new Map();
            if (data[0] !== "{") {
                // has tag
                map.__tag__ = data[0][0];
            }
            return map;
        }),
        sequence(() => [zeroOrOne(tag), literal("{"), members, literal("}")], (data) => {
            const map = new Map();
            let entries;
            if (data[0] === "{") {
                // no tag
                entries = data[1];
            } else {
                // has tag
                map.__tag__ = data[0][0];
                entries = data[2];
            }
            for (let pair of entries) {
                map.set(pair[0], pair[1]);
            }
            return map;
        })
    ]);
    let ref = sequence([literal("*"), number], (data) => new Ref(data[1]));
    let heapRef = sequence([literal("^"), number], (data) => new HeapRef(data[1]));
    let member = sequence([element, literal(":"), element], (data) => [data[0], data[2]]);
    let members = sequence([
        member,
        zeroOrMore(sequence([literal(","), member], (data) => data[1]))
    ], (data) => [data[0], ...data[1]]);
    
    const result = element(input, 0);
    
    if (result) {
        return result.value;
    } else {
        throw new Error("No parse found");
    }
}
exports.parse = parse;

function test() {

    const testCases = [
        "-1.2",
        "5",
        "123",
        "-12",
        "-6",
        "12.50",
        "-5.6",
        "12.5e10",
        "4e5",
        "abc",
        "[1, 2.5, -0.5]",
        "[1,2.5,-0.5]",
        "[1,2.5-0.5]",
        `"abcde"`,
        `"abc\tde"`,
        `"\\u1234"`,
        "{}",
        `{"a": 1}`,
        `{"a": 1, "b": 2}`,
        `{"hello": true, "world": false, "yo": null}`,
        `[{ "name": "jerry", "friends": [ {"name": "shanda"} ] }]`,
        `{ {"id": 1}: "brown" }`,
        `{ *123456: ^1234 }`,
        `{ "funCall": 2, "variables": *215}`,
        `<tuple>[1, 2]`,
        `<tuple>[]`,
        `<function>{}`,
        `<Point>{ "x": 1, "y": 2 }`,
    ];

    for (let testCase of testCases) {
        try {
            const output = parse(testCase, 0);
            if (output) {
                console.log(`"${testCase}" =`, output);
            } else {
                console.log(`"${testCase}" no parse found.`);
            }
        } catch (e) {
            console.log(`${e.message} for ${testCase}.`);
            console.log(e.stack);
        }
    }
    
}

// test();

function characterMatching(choices) {
    return function _characterMatching(buffer, cursor) {
        const char = buffer[cursor];
        if (typeof choices === "string") {
            if (choices.indexOf(char) !== -1) {
                return {
                    value: char,
                    cursor: cursor + 1
                };
            } else {
                return null;
            }
        } else if (typeof choices === "function") {
            if (choices(char)) {
                return {
                    value: char,
                    cursor: cursor + 1
                };
            } else {
                return null;
            }
        } else if (choices instanceof RegExp) {
            if (choices.test(char)) {
                return {
                    value: char,
                    cursor: cursor + 1
                };    
            } else {
                return null;
            }
        } else {
            throw new Error("Unsupported argument type fo characterMatching: " + choices);
        }
    };
}

function literal(string, value) {
    return function _literal(buffer, cursor) {
        if (buffer.substr(cursor, string.length) === string) {
            return {
                value: value !== undefined ? value : string,
                cursor: cursor + string.length
            };
        } else {
            return null;
        }
    };
}

function sequence(parsers, converter) {
    return function _sequence(buffer, cursor) {
        if (typeof parsers === "function") {
            parsers = parsers();
        }
        const values = [];
        let currentCursor = cursor;
        for (let parser of parsers) {
            const result = parser(buffer, currentCursor);
            
            if (result) {
                values.push(result.value);
                currentCursor = result.cursor;
            } else {
                return null;
            }
        }
        return {
            value: converter ? converter(values) : values,
            cursor: currentCursor
        };
    };
}

function oneOrMore(parser) {
    return function _oneOrMore(buffer, cursor) {
        let values = [];
        let currentCursor = cursor;
        while (true) {
            const result = parser(buffer, currentCursor);
            if (result) {
                values.push(result.value);
                currentCursor = result.cursor;
            } else {
                if (values.length === 0) {
                    return null;
                } else {
                    return {
                        value: values.join(""),
                        cursor: currentCursor
                    };
                }
            }
        }
    };
}

function zeroOrMore(parser) {
    return function _zeroOrMore(buffer, cursor) {
        let values = [];
        let currentCursor = cursor;
        while (true) {
            const result = parser(buffer, currentCursor);
            if (result) {
                values.push(result.value);
                currentCursor = result.cursor;
            } else {
                return {
                    value: values,
                    cursor: currentCursor
                };
            }
        }
    };
}

function zeroOrOne(parser) {
    return zeroUpTo(parser, 1);
}

function zeroUpTo(parser, maxTimes) {
    return function _zeroOrMore(buffer, cursor) {
        let values = [];
        let currentCursor = cursor;
        let numMatches = 0;
        while (true) {
            const result = parser(buffer, currentCursor);
            if (result) {
                numMatches++;
                values.push(result.value);
                currentCursor = result.cursor;
                if (numMatches === maxTimes) {
                    return {
                        value: values,
                        cursor: currentCursor
                    };
                }
            } else {
                return {
                    value: values,
                    cursor: currentCursor
                };
            }
        }
    };
}

function choice(choices) {
    return function _choice(buffer, cursor) {
        if (typeof choices === "function") {
            choices = choices();
        }
        for (let choice of choices) {
            const result = choice(buffer, cursor);
            if (result) {
                return result;
            }
        }
        return null;
    };
}

function nothing(value) {
    return function _nothing(buffer, cursor) {
        return {
            value: value,
            cursor: cursor
        };
    }
}

function id(data) {
    return data[0];
}