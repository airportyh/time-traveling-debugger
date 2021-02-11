const { traverse } = require("./traverser");

exports.gatherClosureInfo = 
function gatherClosureInfo(ast, parentScopes, level, closureProviders, closureDependencies) {
    const indent = Array(level + 1).join("  ");
    traverse(ast, (node) => {
        if (node.type === "function_definition" ||
            node.type === "function_expression") {
                
            const varRefs = findVariableReferences(node.body);
            const varAssns = findVariableAssignments(node.body);
            const innerFunctions = findInnerFunctions(node.body);
            const varDefs = node.parameters.concat(varAssns);
            const closures = {};
            
            // figure out which scope each var ref belongs to
            for (let varRef of varRefs) {
                // try to find in parent scope
                const scope = parentScopes.find((scope) => 
                    scope.variables.find((v) => v.value === varRef.var_name.value)
                );
                if (scope) {
                    // console.log(indent + `${varRef.var_name.value} belongs to ${scope.funNode.name.value}`);
                    
                    if (!closureProviders.has(scope.funNode)) {
                        closureProviders.set(scope.funNode, new Set());
                    }
                    
                    closureProviders.get(scope.funNode).add(varRef.var_name.value);
                    
                    if (!closures[scope.funNode.name.value]) {
                        closures[scope.funNode.name.value] = new Set();
                    }
                    closures[scope.funNode.name.value].add(varRef.var_name.value);
                    
                    
                } else {
                    const localScope = !!varDefs.find((varDef) => varDef.value === varRef.var_name.value);
                    if (!localScope) {
                        throw new Error(`${varRef.var_name.value} on line ${varRef.var_name.start.line} column ${varRef.var_name.start.col} is an undefined reference.`);
                    }
                }
            }
            
            closureDependencies.set(node, closures);
            
            // console.log(indent + "closures", closures);
            // 
            // // console.log("  parameters:", node.parameters.map((param) => param.value));
            // console.log(indent + "  varRefs:", varRefs.map((param) => param.var_name.value).join(", "));
            // // console.log("  varAssns:", varAssns.map((param) => param.var_name.value));
            // console.log(indent + `  varDefs: ${varDefs.map((def) => def.value).join(", ")}`);
            // console.log(indent + "  innerFunctions:", innerFunctions.map(funName));
            // console.log();
            const childParentScopes = [
                {
                    funNode: node,
                    variables: varDefs
                },
                ...parentScopes
            ];
            for (let innerFunction of innerFunctions) {
                gatherClosureInfo(innerFunction, childParentScopes, level + 1, closureProviders, closureDependencies);
            }
            return false;
        }
    });
}

function funName(fun) {
    return fun.name && fun.name.value || "<anonymous>";
}

function findVariableReferences(blockNode) {
    const results = [];
    traverse(blockNode, (node) => {
        if (node.type === "var_reference") {
            results.push(node);
        } else if (
            node.type === "function_definition" ||
            node.type === "function_expression") {
            return false;
        }
    });
    return results;
}

function findVariableAssignments(blockNode) {
    const results = [];
    traverse(blockNode, (node) => {
        if (node.type === "var_assignment") {
            results.push(node.var_name);
        } else if (node.type === "for_loop") {
            results.push(node.loop_variable);
        } else if (
            node.type === "function_definition" ||
            node.type === "function_expression")
        {
            return false;
        }
    });
    return results;
}

function findInnerFunctions(blockNode) {
    const results = [];
    traverse(blockNode, (node) => {
        if (
            node.type === "function_definition" ||
            node.type === "function_expression")
        {
            results.push(node);
            return false;
        }
    });
    return results;
}