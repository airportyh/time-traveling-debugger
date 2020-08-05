/*
traverse(ast, (node) => {
    return false;
})
*/
exports.traverse = 
function traverse(node, visit) {
    const result = visit(node);
    if (result === false) {
        return;
    }
    switch (node.type) {
        case "program":
            for (let childNode of node.statements) {
                traverse(childNode, visit);
            }
            break;
        case "comment":
            break;
        case "function_definition":
            traverse(node.body, visit);
            break;
        case "code_block":
            for (let childNode of node.statements) {
                traverse(childNode, visit);
            }
            break;
        case "call_expression":
            for (let childNode of node.arguments) {
                traverse(childNode, visit);
            }
            break;
        case "string_literal":
            break;
        case "var_assignment":
            traverse(node.value, visit);
            break;
        case "var_reference":
            break;
        case "dictionary_literal":
            for (let entry of node.entries) {
                const entryKey = entry[0];
                const entryValue = entry[1];
                traverse(entryKey, visit);
                traverse(entryValue, visit);
            }
            break;
        case "list_literal":
            for (let item of node.items) {
                traverse(item, visit);
            }
            break;
        case "for_loop":
            traverse(node.iterable, visit);
            traverse(node.body, visit);
            break;
        case "while_loop":
            traverse(node.condition, visit);
            traverse(node.body, visit);
            break;
        case "number_literal":
            break;
        case "boolean_literal":
            break;
        case "if_statement":
            traverse(node.condition, visit);
            traverse(node.consequent, visit);
            if (node.alternate) {
                traverse(node.alternate, visit);
            }
            break;
        case "indexed_assignment":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            break;
        case "binary_operation":
            traverse(node.left, visit);
            traverse(node.right, visit);
            break;
        case "indexed_access":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            break;
        case "indexed_assignment":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            traverse(node.value, visit);
            break;
        case "function_expression":
            traverse(node.body, visit);
            break;
        case "identifier":
            break;
        case "return_statement":
            if (node.value) {
                traverse(node.value, visit);
            }
            break;
        case "not_operation":
            traverse(node.subject, visit);
            break;
        case "while_loop":
            traverse(node.condition, visit);
            traverse(node.body, visit);
            break;
        case "break":
            break;
        case "null":
            break;
        default:
            throw new Error("Unhandled node type: " + node.type);
    }
};

exports.traverseAndCollect = function traverseAndCollect(node, visit) {
    const result = visit(node);
    if (result) {
        return result;
    }

    if (node.type === "binary_operation") {
        return [
            ...traverseAndCollect(node.left, visit),
            ...traverseAndCollect(node.right, visit)
        ];
    } else if (node.type === "boolean_literal") {
        return [];
    } else if (node.type === "call_expression") {
        const result = [];
        for (let arg of node.arguments) {
            result.push(...traverseAndCollect(arg, visit));
        }
        return result;
    } else if (node.type === "code_block" || node.type === "program") {
        const result = [];
        for (let statement of node.statements) {
            result.push(...traverseAndCollect(statement, visit));
        }
        return result;
    } else if (node.type === "comment") {
        return [];
    } else if (node.type === "dictionary_literal") {
        const result = [];
        for (let entry of node.entries) {
            result.push(...traverseAndCollect(entry[0], visit));
            result.push(...traverseAndCollect(entry[1], visit));
        }
        return result;
    } else if (node.type === "for_loop") {
        return [
            ...traverseAndCollect(node.iterable, visit),
            ...traverseAndCollect(node.body, visit)
        ];
    } else if (
        node.type === "function_definition" ||
        node.type === "function_expression") {
        return traverseAndCollect(node.body, visit);
    } else if (node.type === "identifier") {
        return [];
    } else if (node.type === "if_statement") {
        const conditionClosures = traverseAndCollect(node.condition, visit);
        const consequentClosures = traverseAndCollect(node.consequent, visit);
        const alternateClosures =
            node.alternate &&
            traverseAndCollect(node.alternate, visit) ||
            [];
        return [
            ...conditionClosures,
            ...consequentClosures,
            ...alternateClosures
        ];
    } else if (node.type === "indexed_access") {
        return [
            ...traverseAndCollect(node.subject, visit),
            ...traverseAndCollect(node.index, visit)
        ];
    } else if (node.type === "indexed_assignment") {
        return [
            ...traverseAndCollect(node.subject, visit),
            ...traverseAndCollect(node.index, visit),
            ...traverseAndCollect(node.value, visit)
        ];
    } else if (node.type === "list_literal") {
        const result = [];
        for (let item of node.items) {
            result.push(...traverseAndCollect(item, visit));
        }
        return result;
    } else if (node.type === "number_literal") {
        return [];
    } else if (node.type === "string_literal") {
        return [];
    } else if (node.type === "return_statement") {
        return traverseAndCollect(node.value, visit);
    } else if (node.type === "var_assignment") {
        return traverseAndCollect(node.value, visit);
    } else if (node.type === "var_reference") {
        return [];
    } else if (node.type === "while_loop") {
        return [
            ...traverseAndCollect(node.condition, visit),
            ...traverseAndCollect(node.body, visit)
        ];
    } else {
        console.log("node", node);
        throw new Error("Unhandled node type: " + node.type);
    }
}
