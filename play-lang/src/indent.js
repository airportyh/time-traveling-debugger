module.exports = function indent(str) {
    return str.split("\n").map(line => "    " + line).join("\n");
}