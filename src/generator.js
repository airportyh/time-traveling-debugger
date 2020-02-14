const indent = require("./indent");
const path = require("path");
const fs = require("fs");
const runtimeCode = fs.readFileSync(path.join(__dirname, "runtime.js")).toString();

exports.generateCode = function generateCode(ast, options) {
    const jsCode =
    [runtimeCode]
    .concat(
        ast.map(node => {
            return generateCodeForTopLevelStatement(node);
        })
    )
    .concat([`main().catch(err => console.log(err.message))`
        + (options.historyFilePath ?
            `.finally(() => $saveHistory("${options.historyFilePath}"));` :
            "")])
    .join("\n\n");
    return jsCode;
}

function generateCodeForTopLevelStatement(node) {
    if (node.type === "comment") {
        return "//" + node.value;
    } else if (node.type === "function_definition") {
        return generateFunction(node);
    } else {
        throw new Error("Unknown AST Node type for top level statements: " + node.type);
    }
}

function generateCodeForExecutableStatement(statement) {
    if (statement.type === "comment") {
        return "//" + statement.value;
    } else if (statement.type === "return_statement") {
        return [
            `$save(${statement.start.line});`,
            `var $retval = ${generateCodeForExpression(statement.value)};`,
            `$setVariable("<ret val>", $retval, ${statement.start.line});`,
            `return $retval;`
        ].join("\n");
        return "return " + generateCodeForExpression(statement.value) + ";";
    } else if (statement.type === "var_assignment") {
        // return "var " + statement.var_name.value + " = " + generateCodeForExpression(statement.value) + ";";
        const varName = statement.var_name.value;
        const value = generateCodeForExpression(statement.value);
        const line = statement.start.line;
        return [
            `$save(${statement.start.line});`,
            `$setVariable("${varName}", ${value}, ${line});`
        ].join("\n");
    } else if (statement.type === "call_expression") {
        return [
            `$save(${statement.start.line});`,
            generateCallExpression(statement) + ";"
        ].join("\n");
    } else if (statement.type === "while_loop") {
        const condition = generateCodeForExpression(statement.condition);
        return [
            `$save(${statement.start.line});`,
            `while (${condition}) {`,
            `${generateCodeForCodeBlock(statement.body)}`,
            `}`
        ].join("\n");
    } else if (statement.type === "if_statement") {
        const condition = generateCodeForExpression(statement.condition);
        const alternate = statement.alternate ?
            generateCodeForIfAlternate(statement.alternate) : "";
        return [
            `if ($save(${statement.start.line}), ${condition}) {`,
            indent(statement.consequent.statements.map(statement => {
                return generateCodeForExecutableStatement(statement);
            }).join("\n")),
            "}",
            alternate
        ].join("\n");
    } else if (statement.type === "for_loop") {
        const loopVar = statement.loop_variable.value;
        const loopTopLine = statement.loop_variable.start.line;
        return [
            `$save(${statement.start.line});`,
            `for (let ${loopVar} of $heapAccess(${generateCodeForExpression(statement.iterable)})) {`,
            indent(`$setVariable("${loopVar}", ${loopVar}, ${loopTopLine});`),
            indent(statement.body.statements.map(statement => {
                return generateCodeForExecutableStatement(statement);
            }).join("\n")),
            "}"
        ].join("\n");
    } else if (statement.type === "indexed_assignment") {
        const subject = generateCodeForExpression(statement.subject);
        const index = generateCodeForExpression(statement.index);
        const value = generateCodeForExpression(statement.value);
        return [
            `$save(${statement.start.line});`,
            `$set(${subject}, ${index}, ${value});`
        ].join("\n");
    } else {
        throw new Error("Unknown AST node type for executable statements: " + statement.type);
    }
}

function generateCallExpression(expression, pauseAfter) {
    const line = expression.start.line;
    const funcCall = expression.fun_name.value + "(" +
        expression.arguments.map(arg => generateCodeForExpression(arg))
            .join(", ") + ")";
    if (pauseAfter) {
        return `($immediateReturnValue = ${funcCall}, $save(${line}), $immediateReturnValue)`;
    } else {
        return funcCall;
    }
}

function generateCodeForIfAlternate(alternate) {
    if (alternate.type === "if_statement") {
        return "else " + generateCodeForExecutableStatement(alternate);
    } else {
        return "else {\n" +
            indent(alternate.statements.map(statement => {
                return generateCodeForExecutableStatement(statement);
            }).join("\n")) + "\n}";
    }
}

// Node is either function_definition
function generateFunction(node) {
    const funName = node.name && node.name.value || null;
    const isAsync = node.type === "function_definition" && funName === "main";
    const firstLine = node.body.start.line;
    const lastLine = node.body.end.line;
    const parameters = node
        .parameters
        .map(p => p.value)
        .join(", ");
    const line1 = (isAsync ? "async " : "") +
        "function " + (funName || "") + "(" + parameters + ") {";
    const body = generateCodeForCodeBlock(node.body);
    return [
        line1,
        indent(`var $immediateReturnValue;`),
        indent(`$pushFrame("${funName || '<anonymous>'}", { ${parameters} });`),
        indent(`try {`),
        indent(body),
        indent(`} finally {`),
        indent(indent([
            `$save(${lastLine});`,
            `$popFrame();`
        ].join("\n"))),
        indent(`}`),
        "}"
    ].join("\n");
}

const operatorMap = {
    ">": ">",
    ">=": ">=",
    "<": "<",
    "<=": "<=",
    "==": "===",
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "%": "%",
    "or": "||",
    "and": "&&"
};

function generateCodeForExpression(expression) {
    if (expression.type === "string_literal") {
        return JSON.stringify(expression.value);
    } else if (expression.type === "number_literal") {
        return String(expression.value);
    } else if (expression.type === "list_literal") {
        const arrayLiteral = "[" + expression.items
            .map(generateCodeForExpression).join(", ") + "]";
        return `$heapAllocate(${arrayLiteral})`;
    } else if (expression.type === "dictionary_literal") {
        const dictLiteral = "{ " + expression.entries.map(entry => {
            return entry[0].value + ": " + generateCodeForExpression(entry[1]);
        }).join(", ") + " }";
        return `$heapAllocate(${dictLiteral})`;
    } else if (expression.type === "binary_operation") {
        const left = generateCodeForExpression(expression.left);
        const right = generateCodeForExpression(expression.right);
        const operator = operatorMap[expression.operator.value];
        if (!operator) {
            throw new Error("Unknown operator " + expression.operator.value);
        }
        return `(${left} ${operator} ${right})`;
    } else if (expression.type === "var_reference") {
        return `$getVariable("${expression.var_name.value}")`;
        // return expression.var_name.value;
    } else if (expression.type === "call_expression") {
        const pauseAfter = !builtInFunctions[expression.fun_name.value]
        return generateCallExpression(expression, pauseAfter);
    } else if (expression.type === "indexed_access") {
        const subject = generateCodeForExpression(expression.subject);
        const index = generateCodeForExpression(expression.index);
        return `$get(${subject}, ${index})`;
    } else if (expression.type === "fun_expression") {
        return generateFunction(expression);
    } else if (expression.type === "boolean_literal") {
        return String(expression.value);
    } else {
        throw new Error("Unsupported AST node type for expressions: " + expression.type);
    }
}

function generateCodeForCodeBlock(codeBlock) {
    return indent(codeBlock.statements.map(
        statement => generateCodeForExecutableStatement(statement))
    .join("\n"));
}
