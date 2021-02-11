const { Parser } = require("acorn");

module.exports = function getFunctions(code) {
    const ast = Parser.parse(code);
    const dict = {};
    ast.body
        .filter((node) => node.type === "FunctionDeclaration")
        .forEach((node) => dict[node.id.name] = node);
    return dict;
}
