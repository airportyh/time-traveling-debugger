const nearley = require("nearley");
const grammar = require("./play-lang");

exports.parse = function parse(code) {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(code);
    if (parser.results.length > 1) {
        throw new Error("The parser found ambiguous parses.");
    }
    if (parser.results.length === 0) {
        throw new Error("No parses found. Input appeared to be incomplete.");
    }
    const ast = parser.results[0];
    return ast;
}
