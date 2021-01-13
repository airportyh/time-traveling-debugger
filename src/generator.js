const indent = require("./indent");
const { gatherClosureInfo } = require("./closure");
const path = require("path");
const fs = require("fs");
const util = require("util");
const getFunctions = require("./get-functions");
const { findClosures } = require("./closure");
const runtimeCode = fs.readFileSync(path.join(__dirname, "runtime.js")).toString();
const builtInFunctions = getFunctions(runtimeCode);

exports.generateCode = function generateCode(ast, options) {
    options = options || {};
    const closureProviders = new Map();
    const closureDependencies = new Map();
    gatherClosureInfo(ast, [], 0, closureProviders, closureDependencies);
    const closureInfo = {
        providers: closureProviders,
        dependencies: closureDependencies
    };
    
    const jsCode =
        [
            `const HISTORY_FILE_PATH = "${options.historyFilePath}"`,
            `const PROFILE_JSON_PATH = "${options.profileJsonPath}"`,
            `const SOURCE_FILE_PATH = "${options.sourceFilePath}"`
        ]
        .concat([options.code ? `const $code = \`${options.code}\`;` : "const $code = null;"])
        .concat(runtimeCode)
        .concat(generateCodeForStatement(ast, null, closureInfo))
        .concat([
            `(async () => {`,
            `  await $initialize();`,
            `  await main();`,
            `})().catch(err => $reportError(err))`,
            (options.historyFilePath ?
                `.finally(() => $cleanUp());` :
                "")
        ])
        .concat(["$isBrowser && createDebugButton();"])
        .join("\n\n");
    return jsCode;
}

function generateCodeForStatement(statement, funNode, closureInfo) {
    if (statement.type === "program") {
        return generateCodeForCodeBlock(statement, statement, closureInfo);
    } else if (statement.type === "code_block") {
        return indent(generateCodeForCodeBlock(statement, funNode, closureInfo));
    } else if (statement.type === "comment") {
        return "//" + statement.value;
    } else if (statement.type === "return_statement") {
        return [
            `$save(${statement.start.line});`,
            `var $retval = ${statement.value ? generateCodeForExpression(statement.value, funNode, closureInfo): null};`,
            `$setVariable("<ret val>", $retval);`,
            `return $retval;`
        ].join("\n");
        return "return " + generateCodeForExpression(statement.value, closureInfo) + ";";
    } else if (statement.type === "var_assignment") {
        const closureProvider = closureInfo.providers.get(funNode);
        const closureDependencies = closureInfo.dependencies.get(funNode);
        const varName = statement.var_name.value;
        const value = generateCodeForExpression(statement.value, funNode, closureInfo);
        let setVarStatement;
        if (closureProvider && closureProvider.has(varName)) {
            const closureVar = `$${funNode.name.value}_closure`;
            setVarStatement = `$setHeapVariable("${varName}", ${value}, ${closureVar});`;
        } else {
            if (closureDependencies) {
                for (let funName in closureDependencies) {
                    const set = closureDependencies[funName];
                    if (set.has(varName)) {
                        const closureVar = `$${funName}_closure`;
                        setVarStatement = `$setHeapVariable("${varName}", ${value}, ${closureVar});`;
                    }
                }
            }
            if (!setVarStatement) {
                setVarStatement = `$setVariable("${varName}", ${value});`;
            }
        }
        const line = statement.start.line;
        return [
            `$save(${statement.start.line});`,
            setVarStatement
        ].join("\n");
    } else if (statement.type === "call_expression") {
        return [
            `$save(${statement.start.line});`,
            generateCallExpression(statement, funNode, closureInfo) + ";"
        ].join("\n");
    } else if (statement.type === "while_loop") {
        const condition = generateCodeForExpression(statement.condition, funNode, closureInfo);
        return [
            `while ($save(${statement.condition.start.line}), ${condition}) {`,
            `${generateCodeForStatement(statement.body, funNode, closureInfo)}`,
            `}`,
            `$save(${statement.end.line});`
        ].join("\n");
    } else if (statement.type === "if_statement") {
        const condition = generateCodeForExpression(statement.condition, funNode, closureInfo);
        const alternate = statement.alternate ?
            generateCodeForIfAlternate(statement.alternate, funNode, closureInfo) : "";
        return [
            `if ($save(${statement.start.line}), ${condition}) {`,
            indent(statement.consequent.statements.map(statement => {
                return generateCodeForStatement(statement, funNode, closureInfo);
            }).join("\n")),
            "}",
            alternate
        ].join("\n");
    } else if (statement.type === "for_loop") {
        const loopVar = statement.loop_variable.value;
        const loopTopLine = statement.loop_variable.start.line;
        return [
            `$save(${statement.start.line});`,
            `for (let ${loopVar} of $heapAccess(${generateCodeForExpression(statement.iterable, funNode, closureInfo)})) {`,
            indent(`$setVariable("${loopVar}", ${loopVar});`),
            indent(statement.body.statements.map(statement => {
                return generateCodeForStatement(statement, funNode, closureInfo);
            }).join("\n")),
            "}"
        ].join("\n");
    } else if (statement.type === "break") {
        return "break;";
    } else if (statement.type === "continue") {
        return "continue";
    } else if (statement.type === "indexed_assignment") {
        const subject = generateCodeForExpression(statement.subject, funNode, closureInfo);
        const index = generateCodeForExpression(statement.index, funNode, closureInfo);
        const value = generateCodeForExpression(statement.value, funNode, closureInfo);
        return [
            `$save(${statement.start.line});`,
            `$set(${subject}, ${index}, ${value});`
        ].join("\n");
    } else if (statement.type === "function_definition") {
        return generateFunction(statement, closureInfo);
    } else {
        throw new Error("Unknown AST node type for executable statements: " + statement.type);
    }
}

function generateCallExpression(expression, funNode, closureInfo, pauseAfter) {
    const line = expression.start.line;
    const funName = expression.fun_name.value;
    const builtIn = builtInFunctions[funName];
    const isAsync = builtIn ? builtIn.async : true;
    let funcCall = funName + "(" +
        expression.arguments.map(arg => generateCodeForExpression(arg, funNode, closureInfo))
            .join(", ") + ")";
    if (isAsync) {
        funcCall = `await ${funcCall}`;
    }
    if (pauseAfter) {
        return `($immediateReturnValue = ${funcCall}, $save(${line}), $immediateReturnValue)`;
    } else {
        return funcCall;
    }
}

function generateCodeForIfAlternate(alternate, funNode, closureInfo) {
    if (alternate.type === "if_statement") {
        return "else " + generateCodeForStatement(alternate, funNode, closureInfo);
    } else {
        return "else {\n" +
            indent(alternate.statements.map(statement => {
                return generateCodeForStatement(statement, funNode, closureInfo);
            }).join("\n")) + "\n}";
    }
}

const operatorMap = {
    ">": ">",
    ">=": ">=",
    "<": "<",
    "<=": "<=",
    "==": "===",
    "!=": "!==",
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "%": "%",
    "or": "||",
    "and": "&&"
};

function generateCodeForExpression(expression, funNode, closureInfo) {
    if (expression.type === "string_literal") {
        return JSON.stringify(expression.value);
    } else if (expression.type === "number_literal") {
        return String(expression.value);
    } else if (expression.type === "list_literal") {
        const arrayLiteral = "[" + expression.items
            .map((item) => {
                return generateCodeForExpression(item, funNode, closureInfo);
            }).join(", ") + "]";
        return `$heapAllocate(${arrayLiteral})`;
    } else if (expression.type === "dictionary_literal") {
        const dictLiteral = "{ " + expression.entries.map(entry => {
            return quote(entry[0].value) + ": " + generateCodeForExpression(entry[1], funNode, closureInfo);
        }).join(", ") + " }";
        return `$heapAllocate(${dictLiteral})`;
    } else if (expression.type === "binary_operation") {
        const left = generateCodeForExpression(expression.left, funNode, closureInfo);
        const right = generateCodeForExpression(expression.right, funNode, closureInfo);
        const operator = operatorMap[expression.operator.value];
        if (!operator) {
            throw new Error("Unknown operator " + expression.operator.value);
        }
        return `(${left} ${operator} ${right})`;
    } else if (expression.type === "var_reference") {
        const closureProvider = closureInfo.providers.get(funNode);
        const closureDependencies = closureInfo.dependencies.get(funNode);
        const varName = expression.var_name.value;
        if (closureProvider && closureProvider.has(varName)) {
            const closureVar = `$${funNode.name.value}_closure`;
            return `$getHeapVariable("${varName}", ${closureVar})`;
        } else {
            if (closureDependencies) {
                for (let funName in closureDependencies) {
                    const set = closureDependencies[funName];
                    if (set.has(varName)) {
                        const closureVar = `$${funName}_closure`;
                        return `$getHeapVariable("${varName}", ${closureVar})`;
                    }
                }
            }
            return `$getVariable("${varName}")`;
        }
        // return expression.var_name.value;
    } else if (expression.type === "call_expression") {
        const funName = expression.fun_name.value;
        const builtIn = builtInFunctions[funName];
        const pauseAfter = !builtIn;
        return generateCallExpression(expression, funNode, closureInfo, pauseAfter);
    } else if (expression.type === "indexed_access") {
        const subject = generateCodeForExpression(expression.subject, funNode, closureInfo);
        const index = generateCodeForExpression(expression.index, funNode, closureInfo);
        return `$get(${subject}, ${index})`;
    } else if (expression.type === "dot_operation") {
        const subject = generateCodeForExpression(expression.subject, funNode, closureInfo);
        const property = expression.property.value;
        return `$get(${subject}, ${quote(property)})`;
    } else if (
        expression.type === "function_expression") {
        return generateFunction(expression, closureInfo);
    } else if (expression.type === "boolean_literal") {
        return String(expression.value);
    } else if (expression.type === "not_operation") {
        return "!" + generateCodeForExpression(expression.subject, funNode, closureInfo);
    } else if (expression.type === "null") {
        return "null";
    } else {
        throw new Error("Unsupported AST node type for expressions: " + expression.type);
    }
}

// Assumes node is of type function_definition or function_expression
function generateFunction(node, closureInfo) {
    const closureProvider = closureInfo.providers.get(node);
    const closureDependencies = closureInfo.dependencies.get(node);
    const funName = node.name && node.name.value || null;
    const isAsync = true;
    const firstLine = node.body.start.line;
    const lastLine = node.body.end.line;
    const parameters = node
        .parameters
        .map(p => p.value);
    let stackParameters = parameters;
    const line1 = (isAsync ? "async " : "") +
        "function " + (funName || "") + "(" + parameters.join(", ") + ") {";
    let body = generateCodeForCodeBlock(node.body, node, closureInfo);
    const useProfiler = funName === "main";
    if (useProfiler) {
        body = [
            "await $startProfiler();",
            body
        ].join("\n");
    }
    const initLines = [`var $immediateReturnValue;`];
    const closuresArray = [];
    if (closureProvider) {
        const closureVar = `$${funName}_closure`;
        initLines.push(indent(`var ${closureVar} = $heapAllocate({});`));
        closuresArray.push(closureVar);
        stackParameters = parameters.filter((param) => !closureProvider.has(param));
        for (let param of parameters) {
            if (closureProvider.has(param)) {
                initLines.push(indent(`$setHeapVariable("${param}", ${param}, ${closureVar});`));
            }
        }
    }
    if (closureDependencies) {
        for (let funName in closureDependencies) {
            const closureVar = `$${funName}_closure`;
            closuresArray.push(closureVar);
        }
    }
    if (closuresArray.length === 0) {
        initLines.push(indent(`$pushFrame("${funName || '<anonymous>'}", { ${stackParameters.join(", ")} });`));
    } else {
        initLines.push(
            indent(`$pushFrame("${funName || '<anonymous>'}", { ${stackParameters.join(", ")} }, [${closuresArray.join(", ")}]);`)
        );
    }
    return [
        line1,
        ...initLines,
        indent(`try {`),
        indent(indent(body)),
        indent(`} catch (e) {`),
        indent(indent([
            `e.line = e.line || $lastLine;`,
            `$saveError(e);`,
            `throw e;`
        ].join("\n"))),
        indent(`} finally {`),
        indent(indent([
            `$save(${lastLine});`,
            `$popFrame();`,
        ].join("\n"))),
        indent(`}`),
        "}"
    ].join("\n");
}

function generateCodeForCodeBlock(codeBlock, funNode, closureInfo) {
    return codeBlock.statements.map(
        statement => generateCodeForStatement(statement, funNode, closureInfo))
    .join("\n");
}

function quote(str) {
    return '"' + str.replace(/\"/g, '\\"') + '"';
}
