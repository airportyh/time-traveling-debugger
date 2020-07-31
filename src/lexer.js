const moo = require("moo");

const lexer = moo.compile({
    ws: /[ \t]+/,
    nl: { match: "\n", lineBreaks: true },
    lte: "<=",
    lt: "<",
    gte: ">=",
    gt: ">",
    eq: "==",
    ne: "!=",
    not: "!",
    lparan: "(",
    rparan: ")",
    comma: ",",
    lbracket: "[",
    rbracket: "]",
    lbrace: "{",
    rbrace: "}",
    assignment: "=",
    plus: "+",
    minus: "-",
    multiply: "*",
    divide: "/",
    modulo: "%",
    colon: ":",
    comment: {
        match: /#[^\n]*/,
        value: s => s.substring(1)
    },
    string_literal: {
        match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
        value: s => JSON.parse(s)
    },
    number_literal: {
        match: /[0-9]+(?:\.[0-9]+)?/,
        value: s => Number(s)
    },
    identifier: {
        match: /[a-z_][a-zA-Z_0-9]*/,
        type: moo.keywords({
            def: "def",
            while: "while",
            for: "for",
            else: "else",
            in: "in",
            if: "if",
            return: "return",
            and: "and",
            or: "or",
            true: "true",
            false: "false",
            break: "break"
        })
    }
});

module.exports = lexer;
