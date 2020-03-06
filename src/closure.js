const { traverseAndCollect } = require("./traverser");
const { difference, intersection, uniq } = require("lodash");

exports.findClosures = function findClosures(node, varDefs, parentScopes) {
    return traverseAndCollect(node, (node) => {
        if (node.type === "function_definition" || node.type === "function_expression") {
            const params = node.parameters.map((param) => param.value);
            return findClosures(node.body, params, parentScopes);
        } else if (node.type === "for_loop") {
            return findClosures(node.body, [node.loop_variable.value], parentScopes);
        } else if (node.type === "code_block" || node.type === "program") {
            // TODO: if parent scope variable collides with function parameter,
            // throw error. We are planning to disallow variable shadowing.
            varDefs = varDefs.concat(findVarDefinitions(node));
            for (let scope of parentScopes) {
                varDefs = difference(varDefs, scope);
            }
            const varRefs = findVarReferencesForFun(node);
            const externalVarRefs = difference(varRefs, varDefs);
            const result = [];
            for (let statement of node.statements) {
                result.push(...findClosures(statement, [], [varDefs, ...parentScopes]));
            }

            const closedVars = [];
            for (let innerFunc of result) {
                if (!innerFunc.externalVarRefs) {
                    continue;
                }
                for (let varRef of innerFunc.externalVarRefs) {
                    if (varDefs.indexOf(varRef) !== -1) {
                        closedVars.push(varRef);
                    } else if (innerFunc.varRefs.indexOf(varRef) !== -1) {
                    } else {
                        externalVarRefs.push(varRef);
                    }
                }
            }

            return [{
                varDefs: uniq(varDefs),
                varRefs: uniq(varRefs),
                externalVarRefs: uniq(externalVarRefs),
                closedVars: uniq(closedVars),
                innerFunctions: result
            }];
        }
    });
}

function findVarReferencesForFun(node) {
    return traverseAndCollect(node, (node) => {
        if (node.type === "var_reference") {
            return [node.var_name.value];
        }
    })
}

function findVarDefinitions(node) {
    const varAssignments = traverseAndCollect(node, (node) => {
        if (node.type === "var_assignment") {
            return [node.var_name.value];
        }
    });

    if (node.type === "for_loop") {
        return [node.loop_variable.value, ...varAssignments];
    } else if (
        node.type === "function_definition" ||
        node.type === "function_expression") {
        return node.parameters.map((param) => param.value);
    } else {
        return varAssignments;
    }
}
