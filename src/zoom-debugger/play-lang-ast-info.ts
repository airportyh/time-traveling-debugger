import { traverse } from "../traverser";
import { ASTInfo, Pos } from "./ast-info";

export class PlayLangASTInfo implements ASTInfo {
    ast: any;
    sourceLines: string[];
    constructor(ast: any, sourceLines: string[]) {
        this.ast = ast;
        this.sourceLines = sourceLines;
    }
    
    getSource(node: any): string {
        const line = this.sourceLines[node.start.line - 1];
        const startIdx = node.start.col;
        const endIdx = node.end.col;
        const callExprCode = line.slice(startIdx, endIdx);
        return callExprCode;
    }
    
    getFunNode(name: string): any {
        return findFunction(this.ast, name);
    }
    
    getFunNodeParameters(funNode: any): string[] {
        return funNode.parameters.map((param) => param.value);
    }
    
    hasSignature(funNode: any): boolean {
        return true;
    }
    
    getUserDefinedFunctions(): string[] {
        const userDefinedFunctions = findNodesOfType(this.ast, "function_definition");
        return userDefinedFunctions.map(fun => fun.name.value);
    }
    
    getCallExpressionsOnLine(funNode: any, line: number): any[] {
        return findNodesOfTypeOnLine(funNode, "call_expression", line);
    }
    
    getVarAssignmentOnLine(funNode: any, line: number): string {
        let node = findNodesOfTypeOnLine(funNode, "var_assignment", line)[0];
        return node && node.var_name.value;
    }
    
    getReturnStatementOnLine(funNode: any, line: number): any {
        return findNodesOfTypeOnLine(funNode, "return_statement", line)[0];
    }
    
    getFunNameForCallExpr(expr: any): string {
        return expr.fun_name.value;
    }
    
    getStartPos(node: any): Pos {
        return { line: node.start.line, col: node.start.col };
    }
    
    getEndPos(node: any): Pos {
        return { line: node.end.line, col: node.end.col };
    }
}

function findFunction(ast, name) {
    let fun;
    traverse(ast, (node) => {
        if (node.type === "function_definition" && node.name.value === name) {
            fun = node;
        }
    });
    return fun;
}

function findNodesOfType(node, type) {
    let defs = [];
    traverse(node, (childNode) => {
        if (childNode.type === type) {
            defs.push(childNode);
        }
    });
    return defs;
}

function findNodesOfTypeOnLine(node, type, lineNo): any[] {
    let defs = [];
    traverse(node, (childNode) => {
        if (childNode.type === type && childNode.start.line === lineNo) {
            defs.push(childNode);
        }
    });
    return defs;
}