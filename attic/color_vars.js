const fs = require("mz/fs");
const path = require("path");
const util = require("util");
const colors = require('colors/safe');

const availableColors = [
    "yellow",
    "magenta",
    "cyan",
    "green",
    "red",
    "blue",
    "brightRed",
    "brightGreen",
    "brightYellow",
    "brightBlue",
    "brightMagenta",
    "brightCyan"
];

async function main() {
    const filename = process.argv[2];
    if (!filename) {
        console.log("Please supply a filename.");
        return;
    }
    const code = (await fs.readFile(filename)).toString();
    const codeArray = code.split("");
    const astFilename = path.basename(filename, ".play") + ".ast";
    const ast = JSON.parse((await fs.readFile(astFilename)).toString());
    let nextId = -1;
    const assignId = () => nextId++;
    // console.log(code);
    // console.log(util.inspect(ast, { depth: 10 }));
    /*
    scope object looks like:
        {
            scopeId: 3,
            variables: {
                body: true,
                table: true,
                black_back_row: true,
                white_back_row: true
            }
        }
    */
    const results = findVarReferenceScopes(ast, [], [], assignId());
    for (let result of results) {
        const color = availableColors[result.scopeId % availableColors.length];
        replace(
            result.node,
            colors[color](result.node.value),
            codeArray
        );
    }
    const newCode = codeArray.join("");
    console.log(newCode);
    
    function findVarReferenceScopes(node, parentScopes, extraVarDefs, scopeId) {
        const results = [];
        traverseAST(node, (node) => {
            if (node.type === "code_block") {
                let varDefs = extraVarDefs.map((varDef) => ({
                    scopeId,
                    node: varDef
                }));
                
                for (let childNode of node.statements) {
                    if (
                        childNode.type !== "for_loop" &&
                        childNode.type !== "while_loop" &&
                        childNode.type !== "if_statement" &&
                        childNode.type !== "function_expression" &&
                        childNode.type !== "function_definition"
                    ) {
                        const results = traverseToGetVarAssignments(childNode, parentScopes, scopeId);
                        varDefs.push(...results);
                    }
                }

                if (varDefs.length > 0) {
                    scopeId = assignId();
                }
                for (let varDef of varDefs) {
                    varDef.scopeId = scopeId;
                }
                const scope = {
                    scopeId,
                    variables: {}
                };
                for (let result of varDefs) {
                    scope.variables[result.node.value] = true;
                }
                const childParentScopes = [
                    scope,
                    ...parentScopes
                ];

                const childResults = [];
                for (let childNode of node.statements) {
                    if (
                        childNode.type === "for_loop" ||
                        childNode.type === "while_loop" ||
                        childNode.type === "if_statement" ||
                        childNode.type !== "function_expression" ||
                        childNode.type !== "function_definition"
                    ) {
                        childResults.push(...
                            findVarReferenceScopes(childNode, childParentScopes, [], scopeId));
                    }
                }
                results.push(...varDefs);
                results.push(...childResults);
                return false;
            }
            else if (node.type === "var_assignment") {
                const varName = node.var_name.value;
                let thisScopeId = findVarInScopes(varName, parentScopes);
                results.push({
                    scopeId: thisScopeId === undefined ? scopeId : thisScopeId,
                    node: node.var_name
                });
            }
            else if (node.type === "var_reference") {
                const varName = node.var_name.value;
                let thisScopeId = findVarInScopes(varName, parentScopes);
                results.push({
                    scopeId: thisScopeId === undefined ? scopeId : thisScopeId,
                    node: node.var_name
                });
            }
            else if (node.type === "for_loop") {
                results.push(...findVarReferenceScopes(node.iterable, parentScopes, [], scopeId));
                results.push(...findVarReferenceScopes(node.body, parentScopes, [node.loop_variable], scopeId));
                return false;
            }
            else if (node.type === "function_expression") {
                results.push(...findVarReferenceScopes(node.body, parentScopes, node.parameters, scopeId));
                return false;
            }
        });
        return results;
    }
}

function traverseToGetVarAssignments(node, parentScopes, scopeId) {
    const results = [];
    traverseAST(node, (node) => {
        if (node.type === "var_assignment") {
            let thisScopeId = findVarInScopes(node.var_name.value, parentScopes);
            if (thisScopeId === undefined) {
                results.push({
                    scopeId,
                    node: node.var_name
                });
            }
        } else if (
            node.type === "function_expression" || 
            node.type === "function_definition") {
            return false;
        }
    });
    return results;
}

function findVarAssignments(node) {
    const results = [];
    traverse(node, (node) => {
        if (node.type === "var_assignment") {
            results.push(node);
            return false;
        }
    });
    return results;
}

function findVarInScopes(varName, parentScopes) {
    for (let parentScope of parentScopes) {
        const parentScopeId = parentScope.scopeId;
        const variables = parentScope.variables;
        if (varName in variables) {
            return parentScopeId;
        }
    }
}

function replace(node, replacement, codeArray) {
    const startIdx = node.start.offset;
    const endIdx = node.end.offset;
    codeArray[startIdx] = replacement;
    for (let i = startIdx + 1; i < endIdx; i++) {
        codeArray[i] = "";
    }
}

main().catch(console.log);
