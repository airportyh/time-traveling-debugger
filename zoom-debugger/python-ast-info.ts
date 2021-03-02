import { ASTInfo, Pos } from "./ast-info";

export class PythonASTInfo implements ASTInfo {
    
    ast: any;
    codeLines: string[];
    nodesInOrder: any[];
    
    constructor(ast: any, codeLines: string[]) {
        this.ast = ast;
        addParentLinks(this.ast, null);
        this.codeLines = codeLines;
    }
    
    getSource(node: any): string {
        return this.codeLines[node.lineno - 1].substring(node.col_offset);
    }
    
    getFunNode(name: string): any {
        if (name === "<module>") {
            return this.ast;
        }
        const funs = [];
        findNodes(this.ast, (node) => node.type === "FunctionDef", funs);
        return funs.filter((node) => node.name === name)[0];
    }
    
    getFunNodeParameters(funNode: any): string[] {
        if (funNode.args) {
            return funNode.args.args.map((arg) => arg.arg);
        } else {
            return [];
        }
    }
    
    hasSignature(funNode: any): boolean {
        return funNode.type !== "Module";
    }
    
    getUserDefinedFunctions(): string[] {
        const results = [];
        findNodes(this.ast, (node) => node.type === "FunctionDef", results);
        return results.map((node) => node.name);
    }
    
    getStatementOnLine(funNode: any, line: number): any {
        const results = [];
        findNodes(funNode, (node) => {
            return node.lineno === line;
        }, results);
        return results[0];
    }
    
    getCallExpressionsOnLine(funNode: any, line: number): any[] {
        const results = [];
        findNodes(this.ast, (node) => {
            return node.type === "Call" && node.lineno === line;
        }, results);
        return results;
    }
    
    getVarAssignmentOnLine(funNode: any, line: number): string | null {
        const results = [];
        findNodes(this.ast, (node) => {
            return node.type === "Assign" && node.lineno === line;
        }, results);
        if (results.length > 0) {
            return results[0].targets[0]["id"];
        } else {
            return null;
        }
    }
    
    getReturnStatementOnLine(funNode: any, line: number): any {
        const results = [];
        findNodes(this.ast, (node) => {
            return node.type === "Return" && node.lineno === line;
        }, results);
        return results[0];
    }
    
    getFunNameForCallExpr(expr: any): string {
        return expr.func.id;
    }
    
    getStartPos(node: any): Pos {
        if (node.type === "Module") {
            return this.getStartPos(node.body[0]);
        }
        return { line: node.lineno, col: node.col_offset };
    }
    
    getEndPos(node: any): Pos {
        const next = getNextLexicalNode(node);
        if (next) {
            let col: number;
            if (next.lineno > node.lineno) {
                col = this.codeLines[node.lineno - 1].length;
            } else {
                col = next.col_offset;
            }
            return { line: next.lineno, col: col };
        } else {
            // end of file
            return { line: node.lineno, col: this.codeLines[node.lineno - 1].length };
        }
    }
    
    static async test() {
        let response = await fetch("http://localhost:1337/api/PythonAST?id=1");
        const ast = await response.json();
        response = await fetch("http://localhost:1337/api/CodeFile?id=1");
        const code = await response.json();
        const codeLines = code.source.split("\n");
        console.log("codeLines", codeLines);
        const astInfo = new PythonASTInfo(ast, codeLines);
        // console.log("source", astInfo.getSource(ast.body[0]));
        console.log(astInfo.ast);
        const fib = astInfo.getFunNode("fib");
        console.log(fib);
        console.log("allUserDefinedFunctions", astInfo.getUserDefinedFunctions());
        const calls = astInfo.getCallExpressionsOnLine(fib, 4);
        console.log("calls on line", calls);
        console.log("next sibling of call", calls[0].nextSibling);
        console.log("parent", calls[0].parent);
        console.log("uncle", calls[0].parent.nextSibling);
        console.log("next lexical node of call", getNextLexicalNode(calls[0]));
        
        const results = [];
        findNodes(astInfo.ast, (node) => {
            return node.type === "Assign" && node.lineno === 5;
        }, results);
        const assign = results[0];
        
        console.log("next lexical node of assign on line", getNextLexicalNode(assign));
        console.log("next next lexical node of assign on line", getNextLexicalNode(getNextLexicalNode(assign)));
        // console.log("return on line", astInfo.getReturnStatementOnLine(fib, 6));
        // console.log("nodes in order", astInfo.nodesInOrder);
    }
}

function findNodes(node: any, matcher: Function, results: any[]) {
    if (node == null) {
        return null;
    }
    if (typeof node !== "object") {
        return null;
    }
    if (matcher(node)) {
        results.push(node);
    }
    if (Array.isArray(node)) {
        for (let child of node) {
            findNodes(child, matcher, results);
        }
        return null;
    } else {
        for (let key in node) {
            if (key === "parent" || key === "nextSibling") continue;
            const child = node[key];
            findNodes(child, matcher, results);
        }
    }
}

function addParentLinks(node: any, parent: any) {
    // console.log("addParentLinks", node, parent);
    if (node == null) {
        return;
    }
    if (typeof node !== "object") {
        return;
    }
    if (Array.isArray(node)) {
        let prevChild;
        for (let child of node) {
            if (prevChild) {
                prevChild.nextSibling = child;
            }
            addParentLinks(child, parent);
            prevChild = child;
        }
    } else {
        node.parent = parent;
        for (let key in node) {
            if (key === "parent" || key === "nextSibling") continue;
                
            const child = node[key];
            addParentLinks(child, node);
        }
    }
}

function getNextLexicalNode(node: any) {
    if (node == null) {
        return null;
    }
    if (node.nextSibling) {
        return node.nextSibling;
    } else {
        return getNextLexicalNode(node.parent);
    }
}