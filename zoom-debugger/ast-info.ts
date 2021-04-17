
/*
AST-based functionality needed:

* get source code for a node
* find function node by name
* get all user defined functions
* get all call expressions on a line
* get all var assignments on a line
* get the return statement on a line

*/
export type Pos = { line: number, col: number };

export interface ASTInfo {
    getSource(node: any): string;
    getFunNode(name: string, lineNo: number): any;
    getFunNodeParameters(funNode: any): string[];
    hasSignature(funNode: any): boolean;
    getUserDefinedFunctions(): string[];
    getCallExpressionsOnLine(funNode: any, line: number): any[];
    getStatementOnLine(funNode: any, line: number): any;
    getVarAssignmentOnLine(funNode: any, line: number): string | null;
    getReturnStatementOnLine(funNode: any, line: number): any;
    getFunNameForCallExpr(expr: any): string;
    getStartPos(node: any): Pos;
    getEndPos(node: any): Pos;
}