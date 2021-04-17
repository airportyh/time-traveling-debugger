import { ZoomRenderable, BoundingBox } from "./zui";
import { FunCall, Snapshot } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { ZoomDebuggerContext } from "./zoom-debugger";
import { DataCache } from "./data-cache";
import { ASTInfo } from "./ast-info";
const { Ref, HeapRef } = require("../json-like/json-like.js");

const CODE_LINE_HEIGHT = 1.8;
const CODE_FONT_FAMILY = "Monaco";
const LINE_NUMBER_COLOR = "#666666";
const CODE_COLOR = "black";
const VARIABLE_DISPLAY_COLOR = "#c94ec7";

type SubEntryGroup = {
    callExpr: any,
    funCall: FunCall
};

export type CodeInfo = {
    ast: any,
    codeFile: any,
    codeLines: string[],
    astInfo: ASTInfo
}

function textBox(text: string, color: string): TextBox {
    return {
        type: "text",
        text,
        color
    };
}

function horizontalBox(border?: {
    width?: number,
    color?: string
}): ContainerBox {
    return {
        type: "container",
        direction: "horizontal",
        children: [],
        border
    }
}

export class FunCallRenderer implements ZoomRenderable {
    funCall: FunCall;
    callExpr: any;
    callExprCode: string;
    context: ZoomDebuggerContext;
    userDefinedFunctionNames: string[];
    codeInfo: CodeInfo;

    constructor(funCall: FunCall, callExpr: any, context: ZoomDebuggerContext) {
        this.funCall = funCall;
        this.callExpr = callExpr;
        this.context = context;
        // this.userDefinedFunctionNames = this.astInfo.getUserDefinedFunctions();
    }
    
    get cache(): DataCache {
        return this.context.dataCache;
    }

    id(): string {
        return String(this.funCall.id);
    }

    hoverable(): boolean {
        return false;
    }

    get astInfo(): ASTInfo {
        return this.codeInfo?.astInfo;
    }
    
    get fun(): any {
        return this.cache.getFun(this.funCall.fun_id);
    }

    lazyInit(): boolean {
        if (this.codeInfo) {
            return true;
        } else {
            const fun = this.cache.getFun(this.funCall.fun_id);
            this.codeInfo = this.cache.getCodeInfo(fun.code_file_id);
            if (this.codeInfo) {
                if (!this.callExpr) {
                    // main()
                    this.callExprCode = fun.name + "()";
                } else {
                    this.callExprCode = this.astInfo.getSource(this.callExpr);
                }
                return true;
            } else {
                return false;
            }
        }
    }

    render(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        viewport: BoundingBox
    ): Map<BoundingBox, ZoomRenderable> {
        // lazy init astInfo and callExprCode
        if (!this.lazyInit()) {
            return new Map();
        }

        // TODO: move this logic to container
        if (bbox.x + bbox.width < viewport.x ||
            bbox.y + bbox.height < viewport.y ||
            bbox.x > viewport.width ||
            bbox.y > viewport.height) {
            return new Map();
        }
        const myArea = bbox.width * bbox.height;
        const myAreaRatio = myArea / (viewport.width * viewport.height);
        const funName = this.fun.name;
        const funNode = this.astInfo.getFunNode(funName, this.fun.line_no);
        if (!funNode) {
            console.log("Could not find funNode for", funName, "in", this.callExpr);
        }

        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);

        if (myAreaRatio >= 0.4) {
            if (this.cache.getFunCallExpanded(this.funCall.id)) {
                const { codeBox, childMap } = this.getCodeBox();

                const bboxMap = fitBox(codeBox, bbox, viewport, CODE_FONT_FAMILY, 
                    "normal", true, this.context.textMeasurer, CODE_LINE_HEIGHT, ctx);

                // generate map from bounding box to child zoom-renderable
                let childRenderables: Map<BoundingBox, ZoomRenderable> = new Map();
                for (let [box, renderable] of childMap) {
                    const childBBox = bboxMap.get(box);
                    childRenderables.set(childBBox, renderable);
                }
                return childRenderables;
            }
        }
        const textBox: TextBox = {
            type: "text",
            text: this.callExprCode
        };
        fitBox(
            textBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, 
            this.context.textMeasurer, CODE_LINE_HEIGHT, ctx
        );
        return new Map();
    }
    
    getCodeBox(): { codeBox: Box, childMap: Map<Box, ZoomRenderable> } {
        const childMap: Map<Box, ZoomRenderable> = new Map();
        
        const funNode = this.astInfo.getFunNode(this.fun.name, this.fun.line_no);
        
        const codeBox: Box = {
            type: "container",
            direction: "vertical",
            children: []
        };
        
        if (this.astInfo.hasSignature(funNode)) {
            // layout the function signature
            this.layoutFunctionSignature(funNode, this.funCall, 0, codeBox);
        }
        
        const snapshots = this.cache.getFunCallSnapshots(this.funCall.id);
        
        let currLineNo = snapshots[0].line_no;
        let currGroup = [snapshots[0]];
        
        const buildBox = (node: any, line: string, funCallIds: number[], top: boolean): [Box, number] => {
            let charCount: number;
            const asIs = [
                "Constant", "ImportFrom", "Import", "Tuple",
                "Name", "List", "Delete", "Dict", "Try",
                "Subscript", "Attribute", "BoolOp", "Break",
                "AugAssign"
            ];
            let box: Box;
            if (node.type === "Expr") {
                [box, charCount] = buildBox(node.value, line, funCallIds, false);
            } else if (node.type === "Call") {
                const args = node.args;
                const funCallId = funCallIds.pop();
                let funCall: FunCall;
                if (funCallId > 0) {
                    funCall = this.cache.getFunCall(funCallId);
                }
                if (args.length > 0) {
                    if (funCallId > 0) {
                        box = horizontalBox({ width: 1, color: CODE_COLOR });
                    } else {
                        box = horizontalBox();
                    }
                    const prefix = line.substring(node.col_offset, args[0].col_offset);
                    box.children.push(textBox(prefix, CODE_COLOR));
                    for (let i = 0; i < args.length; i++) {
                        const arg = args[i];
                        const nextArg = args[i + 1];
                        const [childBox, _] = buildBox(arg, line, funCallIds, false);
                        box.children.push(childBox);
                        if (nextArg) {
                            box.children.push(textBox(line.substring(arg.end_col_offset, nextArg.col_offset), CODE_COLOR));
                        }
                    }
                    const suffix = line.substring(args[args.length - 1].end_col_offset, node.end_col_offset);
                    box.children.push(textBox(suffix, CODE_COLOR));
                } else {
                    box = textBox(line.substring(node.col_offset, node.end_col_offset), CODE_COLOR);
                }
                if (funCall) {
                    // console.log("making child renderer with", funCallId, funCall, node);
                    const childRenderer = new FunCallRenderer(funCall, node, this.context);    
                    childMap.set(box, childRenderer);
                }
                charCount = node.end_col_offset - node.col_offset;
            } else if (asIs.indexOf(node.type) !== -1) {
                box = textBox(line.substring(node.col_offset, node.end_col_offset), CODE_COLOR);
                charCount = node.end_col_offset - node.col_offset;
            } else if (node.type === "ClassDef") {
                throw new Error("Unsupported ClassDef");
            } else if (node.type === "FunctionDef") {
                throw new Error("Unsupported FunctionDef");
            } else if (node.type === "If" || node.type === "For" || node.type === "While") {
                const text = line.substring(node.col_offset);
                box = textBox(text, CODE_COLOR);
                charCount = text.length;
            } else if (node.type === "Assign") {
                const prefix = line.substring(node.col_offset, node.value.col_offset);
                const [valueBox, childCharCount] = buildBox(node.value, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(textBox(prefix, CODE_COLOR));
                box.children.push(valueBox);
                charCount = node.end_col_offset - node.col_offset;
            } else if (node.type === "Name" || node.type === "List" || node.type === "Delete") {
                box = textBox(line.substring(node.col_offset, node.end_col_offset), CODE_COLOR);
                charCount = node.end_col_offset - node.col_offset;
            } else if (node.type === "BinOp") {
                const [leftBox, _] = buildBox(node.left, line, funCallIds, false);
                const [rightBox, __] = buildBox(node.right, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(leftBox);
                box.children.push(textBox(line.substring(node.left.end_col_offset, node.right.col_offset), CODE_COLOR));
                box.children.push(rightBox);
                charCount = node.end_col_offset - node.col_offset;
            } else if (node.type === "Return") {
                const [valueBox, _] = buildBox(node.value, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(textBox(line.substring(node.col_offset, node.value.col_offset), CODE_COLOR));
                box.children.push(valueBox);
                charCount = node.end_col_offset - node.col_offset;
            } else if (node.type instanceof Object && node.body) {
                // except handler
                box = textBox(line, CODE_COLOR);
            } else {
                console.error("Don't know how to handle AST node", node);
                throw new Error(`Don't know how to handle AST node type ${node.type}.`);
            }
            if (top) {
                const prefix = line.substring(0, node.col_offset);
                const retBox = horizontalBox();
                retBox.children.push(textBox(prefix, CODE_COLOR));
                retBox.children.push(box);
                box = retBox;
                charCount += prefix.length;
            }
            return [box, charCount];
        }
        
        const commitCurrGroup = (nextSnapshot: Snapshot | null) => {
            const lineNo = currGroup[0].line_no;
            const line = this.codeInfo.codeLines[lineNo - 1];
            const statement = this.astInfo.getStatementOnLine(funNode, lineNo);
            if (!statement) {
                console.log("line", line, "funNode", funNode);
                throw new Error("No statement found on line " + lineNo);
            }
            const funCallIds = [];
            
            for (let snapshot of currGroup) {
                if (snapshot.start_fun_call_id !== null) {
                    funCallIds.push(snapshot.start_fun_call_id);
                }
            }
            
            if (statement.type === "ClassDef" || statement.type === "FunctionDef") {
                return;
            }
            const [stmtBox, charCount] = buildBox(statement, line, funCallIds, true);
            const lineBox = horizontalBox();
            lineBox.children.push(stmtBox);
            
            const firstSnapshot = currGroup[0];
            nextSnapshot = nextSnapshot || currGroup[currGroup.length - 1];
            
            codeBox.children.push(lineBox);
            
            const varLines: string[] = [];
            varLines.push(...this.renderVariableAssignments(firstSnapshot, nextSnapshot, funNode));
            varLines.push(...this.renderUpdatedHeapObjects(firstSnapshot, nextSnapshot, funNode));
            varLines.push(...this.renderReturnValues(firstSnapshot, nextSnapshot, funNode));
            
            if (varLines.length > 0) {
                lineBox.children.push(textBox(' ' + varLines[0], VARIABLE_DISPLAY_COLOR));
                
                codeBox.children.push(...varLines.slice(1).map((line) => 
                    textBox("".padStart(charCount + 1) + line, VARIABLE_DISPLAY_COLOR)));
            }
            
        };
        for (let i = 1; i < snapshots.length; i++) {
            const snapshot = snapshots[i];
            if (currLineNo === snapshot.line_no) {
                currGroup.push(snapshot);
            } else {
                // commit previous group of snapshots which
                // occurred on the same source line
                commitCurrGroup(snapshot);
                
                // reset currGroup to one starting with this
                // snapshot
                currGroup = [snapshot];
                currLineNo = snapshot.line_no;
            }
        }
        
        if (currGroup.length > 0) {
            commitCurrGroup(null);
        }
        
        return { codeBox, childMap };
        
        
    }
    
    renderVariableAssignments(
        snapshot: Snapshot, 
        nextSnapshot: Snapshot, 
        funNode: any
    ): string[] {
        let varname: string;
        const statement: any = this.astInfo.getStatementOnLine(funNode, snapshot.line_no);
        if (statement.type === "Assign") {
            varname = statement.targets[0]["id"];
        } else if (statement.type === "For") {
            varname = statement.target.id;
        }
        if (varname) {
            if (!nextSnapshot) {
                throw new Error("No next snapshot");
            }
            let value = this.getVarValue(varname, this.funCall, nextSnapshot);
            let display = this.renderValue(`${varname} = `, "", value, nextSnapshot.heap, new Set(), []);
            return display;
        }
        return [];
    }
    
    getValueDisplay(value: any, snapshot: Snapshot): Box {
        if (isHeapRef(value)) {
            const display = this.renderValueOneLine(value, snapshot.heap, new Set());
            return textBox(display, VARIABLE_DISPLAY_COLOR);
        } else {
            return textBox(this.stringify(value), VARIABLE_DISPLAY_COLOR);
        }
    }
    
    renderValueOneLine(value, heapVersion, visited) {
        if (!isHeapRef(value)) {
            return this.stringify(value);
        }
        
        const ref = value;
        const refId = ref.id;
        const oid = this.cache.heapLookup(heapVersion, refId);
        if (!oid) {
            return "{}";
        }
        let object = this.cache.getObject(oid);
        if (object === undefined) {
            return "{}";
        }
        // log.write(`heap: ${inspect(heap)}`);
        // log.write(`renderValueOneLine(${inspect(refId)}, ${inspect(ref)}, ${oid}, ${inspect(object)}\n`);
        if (visited.has(refId) && (typeof object !== "string")) {
            return "*" + refId;
        }
        visited.add(refId);
        
        if (typeof object === "string") {
            return JSON.stringify(object);
        } else if (Array.isArray(object)) {
            let outputs = object.map((item) => this.renderValueOneLine(item, heapVersion, visited));
            let tag = object["__tag__"];
            let output;
            if (tag === "tuple") {
                output = "(" + outputs.join(", ") + ")";
            } else if (tag === "set") {
                output = "{" + outputs.join(", ") + "}";
            } else {
                output = "[" + outputs.join(", ") + "]";
                if (tag) {
                    output = `<${object["__tag__"]}>${output}`;
                }
            }
            return output;
        } else if (object instanceof Map){
            let keys = Array.from(object.keys());
            let output;
            if (keys.length === 1 && keys[0] === "__dict__") {
                const dict = object.get("__dict__");
                output = this.renderValueOneLine(dict, heapVersion, visited);
            } else {
                let outputs = [];
                object.forEach((value, key) => {
                    if (isHeapRef(key)) {
                        const realKey = this.cache.getHeapObject(heapVersion, key.id);
                        if (typeof realKey === "string") {
                            if (realKey.startsWith("__")) {
                                return;
                            }
                        }
                    }
                    const keyDisplay = this.renderValueOneLine(key, heapVersion, visited);
                    const valueDisplay = this.renderValueOneLine(value, heapVersion, visited);
                    outputs.push(keyDisplay + ": " + valueDisplay);
                });
                output = "{" + outputs.join(", ") + "}";
            }
            let tag = object["__tag__"];
            if (tag === "type") {
                tag = "class";
            }
            if (tag) {
                if (output === "{}") {
                    output = "";
                }
                output = `<${tag}>${output}`;
            }
            return output;
        } else {
            throw new Error("Unsupported type: " + JSON.stringify(object));
        }
    }
    
    renderValue(prefix, indent, value, heapVersion, visited, path): string[] {
        const localVisited = new Set(visited);
        const oneLine = this.renderValueOneLine(value, heapVersion, localVisited);
        const widthLimit = 20;
        if (indent.length + prefix.length + oneLine.length < widthLimit) {
            for (let id of localVisited) {
                visited.add(id);
            }
            return [indent.concat(prefix).concat(oneLine)];
        } else {
            return this.renderValueMultiLine(prefix, indent, value, heapVersion, visited, path);
        }
    }
    
    renderValueMultiLine(prefix, indent, value, heapVersion, visited, path): string[] {
        // log.write(`RenderValueMultiline(${inspect(path)}, ${inspect(value)})\n`);
        if (!isHeapRef(value)) {
            
            return [indent.concat(prefix).concat(this.stringify(value))];
        }
        const ref = value;
        const refId = ref.id;
        const childPath = [...path, refId];
        const oid = this.cache.heapLookup(heapVersion, refId);
        if (!oid) {
            return ["{}"];
        }
        let object = this.cache.getObject(oid);
        
        if (visited.has(refId) && (typeof object !== "string")) {
            return ["*" + refId];
        }
        visited.add(refId);
        let lines = [];
        if (typeof object === "string") {
            lines.push(indent.concat(prefix).concat(JSON.stringify(object)));
        } else if (Array.isArray(object)) {
            let begin;
            let end;
            let tag = object["__tag__"];
            if (tag === "tuple") {
                begin = "( ";
                end = ")";
            } else if (tag === "set") {
                begin = "{ ";
                end = "}";
            } else {
                begin = "[ ";
                end = "]";
                if (tag) {
                    begin = `<${tag}>`.concat(begin);
                }
            }
            lines.push(indent.concat(prefix).concat(begin));
            for (let i = 0; i < object.length; i++) {
                let item = object[i];
                lines.push(...
                    this.renderValue(
                        "", indent.concat("  "), 
                        item, heapVersion, visited, childPath)
                    );
                if (i !== object.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push(indent.concat(end));
        } else if (object instanceof Map) {
            let tag = object["__tag__"];
            if (tag === "type") {
                tag = "class";
            }
            let keys = Array.from(object.keys());
            if (keys.length === 1 && keys[0] === "__dict__") {
                const dict = object.get("__dict__");
                const display = this.renderValue(prefix.concat(`<${tag}>`), indent, dict, heapVersion, visited, childPath);
                lines.push(...display);
            } else {
                let begin = "{";
                if (tag) {
                    begin = `<${tag}>${begin}`;
                }
                lines.push(indent.concat(prefix).concat(begin));
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if (isHeapRef(key)) {
                        const realKey = this.cache.getHeapObject(heapVersion, key.id);
                        if (typeof realKey === "string") {
                            if (realKey.startsWith("__")) {
                                continue;
                            }
                        }
                    }
                    const keyDisplay = this.renderValue("", "", key, heapVersion, visited, childPath);
                    lines.push(...keyDisplay.slice(0, keyDisplay.length - 1));
                    const keyDisplayLastLine = keyDisplay[keyDisplay.length - 1];
                    let value = object.get(key);
                    const valueDisplay = this.renderValue(
                        keyDisplayLastLine + ": ", indent + "  ", value, heapVersion, visited, childPath);
                    lines.push(...valueDisplay);
                    if (i !== keys.length - 1) {
                        lines[lines.length - 1] += ", ";
                    }
                }
                lines.push(indent + "}");
            }
        } else {
            throw new Error("Unsupported type: " + JSON.stringify(object));
        }
        
        return lines;
    }
    
    stringify(value: any): string {
        if (value == null) {
            return "None";
        } else if (value === true) {
            return "True";
        } else if (value === false) {
            return "False";
        } else {
            return JSON.stringify(value);
        }
    }
    
    getVarValue(varName: string, funCall: FunCall, snapshot: Snapshot) {
        let varValue: any;
        const locals = this.cache.getHeapObject(snapshot.heap, funCall.locals);
        if (locals.has(varName)) {
            varValue = locals.get(varName);
        }
        if (funCall.globals) {
            const globals = this.context.dataCache.getHeapObject(snapshot.heap, funCall.globals);
            if (globals.has(varName)) {
                varValue = globals.get(varName);
            }
        }
        if (funCall.closure_cellvars) {
            const cellvars = funCall.closure_cellvars;
            if (cellvars.has(varName)) {
                varValue = cellvars.get(varName);
                if (isHeapRef(varValue)) {
                    varValue = this.context.dataCache.getHeapObject(snapshot.heap, varValue.id);
                    varValue = varValue.get("ob_ref");
                }
            }
        }
        if (funCall.closure_freevars) {
            const freevars = funCall.closure_freevars;
            if (freevars.has(varName)) {
                varValue = freevars.get(varName);
                if (isHeapRef(varValue)) {
                    varValue = this.context.dataCache.getHeapObject(snapshot.heap, varValue.id);
                    varValue = varValue.get("ob_ref");
                }
            }
        }
        return varValue;
    }

    buildChildCallMap(funNode: any, funCall: FunCall): Map<Snapshot, SubEntryGroup[]> {
        const childCallMap: Map<Snapshot, SubEntryGroup[]> = new Map();
        let childFunCallIdx = 0;
        const snapshots = this.cache.getFunCallSnapshots(funCall.id);
        const childFunCalls = this.cache.getFunCallChildFunCalls(funCall.id);
        for (let i = 0; i < snapshots.length; i++) {
            const snapshot = snapshots[i];
            const nextSnapshot = snapshots[i + 1];
            if (nextSnapshot && snapshot.line_no === nextSnapshot.line_no) {
                continue;
            }
            let callExprs: any[] = this.astInfo.getCallExpressionsOnLine(funNode, snapshot.line_no);
            //callExprs = callExprs.filter(expr => this.userDefinedFunctionNames.includes(this.astInfo.getFunNameForCallExpr(expr)));
            for (let j = 0; j < callExprs.length; j++) {
                const callExpr = callExprs[j];
                if (!childCallMap.has(snapshot)) {
                    childCallMap.set(snapshot, []);
                }
                const funCall = childFunCalls[childFunCallIdx++];
                if (!funCall) {
                    throw new Error("HERE Y NO FUN CALL?");
                }
                childCallMap.get(snapshot).push({
                    callExpr,
                    funCall
                });
            }
        }
        return childCallMap;
    }

    renderLine(
        line: string, 
        entry: Snapshot, 
        lineBox: ContainerBox, 
        childEntries: Map<Snapshot, SubEntryGroup[]>,
        childMap: Map<Box, ZoomRenderable>
    ) {

        const subEntryGroups = childEntries.get(entry);
        //console.log("renderLine subEntryGroups", subEntryGroups, "childEntries", childEntries, "entry", entry);
        if (!subEntryGroups) {
            lineBox.children.push({
                type: "text",
                text: line,
                color: CODE_COLOR
            });
            return;
        }

        let pos = 0;
        for (let i = 0; i < subEntryGroups.length; i++) {
            const subEntryGroup = subEntryGroups[i];
            const callExprNode = subEntryGroup.callExpr;
            const startIdx = this.astInfo.getStartPos(callExprNode).col;
            const endIdx = this.astInfo.getEndPos(callExprNode).col;
            // console.log("callExprNode", callExprNode, "startIdx", startIdx, "endIdx", endIdx);
            const previousCode = line.slice(pos, startIdx);
            pos = endIdx;

            lineBox.children.push({
                type: "text",
                text: previousCode,
                color: CODE_COLOR
            });

            const callExprCode = line.slice(startIdx, endIdx);
            const callExprTextBox: TextBox = {
                type: "text",
                text: callExprCode,
                color: CODE_COLOR
            };

            lineBox.children.push(callExprTextBox);

            if (!subEntryGroup.funCall) {
                throw new Error("Y NO FUN CALL?");
            }
            childMap.set(
                callExprTextBox, 
                new FunCallRenderer(
                    subEntryGroup.funCall,
                    callExprNode,
                    this.context
                )
            );
        }
        const rest = line.slice(pos);
        if (rest.length > 0) {
            lineBox.children.push({
                type: "text",
                text: rest,
                color: CODE_COLOR
            });
        }
    }

    renderUpdatedHeapObjects(snapshot: Snapshot, nextSnapshot: Snapshot, funNode: any): string[] {
        let varNameAssigned = this.astInfo.getVarAssignmentOnLine(funNode, snapshot.line_no);
        const locals = this.funCall.locals;
        if (nextSnapshot) {
            let varlines: string[] = [];
            const nextVariables = this.context.dataCache.getHeapObject(nextSnapshot.heap, locals);
            const currentVariables = this.context.dataCache.getHeapObject(snapshot.heap, locals);
            
            for (let varName of currentVariables.keys()) {
                if (varName === varNameAssigned) {
                    // ignore because it was the assignment, and would have been handled by the other method
                    continue;
                }
                const value = currentVariables.get(varName);
                if (isHeapRef(value)) {
                    const nextValue = nextVariables.get(varName);
                    const headValueChanged = hasHeapValueChanged(value.id, this.context.dataCache, snapshot.heap, nextSnapshot.heap);
                    if (!nextValue || headValueChanged) {
                        let display = this.renderValue(`${varName} = `, '', nextValue, nextSnapshot.heap, new Set(), []);
                        varlines.push(...display);
                    }
                }
            }
            const nextGlobals = this.context.dataCache.getHeapObject(nextSnapshot.heap, this.funCall.globals);
            const currentGlobals = this.context.dataCache.getHeapObject(snapshot.heap, this.funCall.globals);
            
            if (currentGlobals) {
                for (let varName of currentGlobals.keys()) {
                    if (varName === varNameAssigned) {
                        continue;
                    }
                    const value = currentGlobals.get(varName);
                    if (isHeapRef(value)) {
                        const nextValue = nextGlobals.get(varName);
                        const headValueChanged = hasHeapValueChanged(value.id, this.context.dataCache, snapshot.heap, nextSnapshot.heap);
                        
                        if (!nextValue || headValueChanged) {
                            let display = this.renderValue(`${varName} = `, '', nextValue, nextSnapshot.heap, new Set(), []);
                            varlines.push(...display);
                        }
                    }
                }
            }
            return varlines;
        } else { 
            return [];
        }
    }

    renderReturnValues(snapshot: Snapshot, nextSnapshot: Snapshot, funNode: any): string[] {
        // Display variable values for return statements
        const returnStatement = this.astInfo.getReturnStatementOnLine(funNode, snapshot.line_no);

        if (returnStatement) {
            const snapshotToUse = nextSnapshot || snapshot;
            const variables = this.context.dataCache.getHeapObject(snapshotToUse.heap, this.funCall.locals);
            const value = variables.get("<ret val>");
            const display = this.renderValue(`<ret val> = `, '', value, snapshotToUse.heap, new Set(), []);
            return display;
            // const valueDisplay = this.getVarValueDisplay(snapshotToUse, varValue, childMap);
            // const tagged: Box[][] = valueDisplay.map((line, idx) => {
            //     if (idx === 0) {
            //         return [ textBox(`<ret val> = `, VARIABLE_DISPLAY_COLOR), ...line ];
            //     } else {
            //         return [ textBox(Array(`<ret val> = `.length + 1).join(" "), VARIABLE_DISPLAY_COLOR), ...line ];
            //     }
            // });
            // valueDisplayStrings.push(...tagged);
        } else {
            return [];
        }
    }

    layoutFunctionSignature(funNode: any, funCall: FunCall, lineNumberWidth: number, codeBox: ContainerBox) {
        const startPos = this.astInfo.getStartPos(funNode);
        const funSigBox: ContainerBox = horizontalBox();
        const funSigLine = this.codeInfo.codeLines[startPos.line - 1];
        funSigBox.children.push(textBox(funSigLine, CODE_COLOR));
        const snapshot = this.cache.getFunCallSnapshots(funCall.id)[0];
        const variables = this.cache.getHeapObject(snapshot.heap, funCall.locals);
        const parameters = this.astInfo.getFunNodeParameters(funNode);
        
        const paramsDisplay: string[] = [];
        for (let paramName of parameters) {
            let value = variables.get(paramName);
            const display = this.renderValue(`${paramName} = `, "", value, snapshot.heap, new Set(), []);
            paramsDisplay.push(...display);
            
        }
        
        if (paramsDisplay.length > 0) {
            funSigBox.children.push(textBox(' ' + paramsDisplay[0], VARIABLE_DISPLAY_COLOR));
        }
        codeBox.children.push(funSigBox);
        codeBox.children.push(...paramsDisplay.slice(1).map((line) => {
            return textBox("".padStart(funSigLine.length + 1) + line, VARIABLE_DISPLAY_COLOR);
        }));
    
        return funSigBox;
    }

    getVarValueDisplay(snapshot: Snapshot, value: any, childMap: Map<Box, ZoomRenderable>): Box[][] {
        let objectId: any = null;
        if (isObjectRef(value)) {
            objectId = value.id;
            value = this.cache.getObject(value.id);
        }
        if (isHeapRef(value)) {
            let object = this.cache.getHeapObject(snapshot.heap, value.id);
            if (!object) {
                return [[textBox("{}", VARIABLE_DISPLAY_COLOR)]]
            }
            if (typeof object === "string") {
                return [[getValueDisplay(snapshot, object, childMap, this.context.textMeasurer, this.context)]];
            } else if (Array.isArray(object)) {
                if (object.length === 0) {
                    return [[textBox("[]", VARIABLE_DISPLAY_COLOR)]];
                }
                
                const row: Box[] = [];
                for (let i = 0; i < object.length; i++) {
                    const item = object[i];
                    const itemBox = getValueDisplay(snapshot, item, childMap, this.context.textMeasurer, this.context);
                    itemBox.text = " " + itemBox.text + " ";
                    if (!itemBox.border) {
                        itemBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    }
                    row.push(itemBox);
                }
                return [row];
            } else { // it's a map
                const leftColumnWidth = Math.max(...Object.keys(object).map((key) => key.length));
                const rightColumnWidth = Math.max(...Object.keys(object).map((key) => getValueDisplayLength(object[key])));
                const table: Box[][] = [];
                for (let [prop, propValue] of object.entries()) {
                    const propBox = getValueDisplay(snapshot, prop, childMap, this.context.textMeasurer, this.context);
                    const propValueBox = getValueDisplay(snapshot, propValue, childMap, this.context.textMeasurer, this.context);
                    propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
                    table.push([propBox, propValueBox]);
                }
                return table;
            }
        }
        return [[getValueDisplay(snapshot, value, childMap, this.context.textMeasurer, this.context)]];
    }

}

// class HeapObjectRenderer implements ZoomRenderable {
//     constructor(
//         public snapshot: Snapshot,
//         public value: any, 
//         public textMeasurer: TextMeasurer,
//         public context: ZoomDebuggerContext
//     ) {
//     }
// 
//     id(): string {
//         return `heapObject[${this.snapshot.id},${this.value.id}]`;
//     }
// 
//     hoverable(): boolean {
//         return true;
//     }
// 
//     get cache(): DataCache {
//         return this.context.dataCache;
//     }
// 
//     render(
//         ctx: CanvasRenderingContext2D,
//         bbox: BoundingBox,
//         viewport: BoundingBox
//     ): Map<BoundingBox, ZoomRenderable> {
//         const childMap: Map<Box, ZoomRenderable> = new Map();
//         const myArea = bbox.width * bbox.height;
//         const myAreaRatio = myArea / (viewport.width * viewport.height);
//         if (myAreaRatio > 0.0005) {
//             ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
//             const object = this.cache.getHeapObject(this.snapshot.heap, this.value.id);
// 
//             if (!object) {
//                 return new Map();
//             }
// 
//             let box: Box;
//             if (Array.isArray(object)) {
//                 box = horizontalBox();
//                 for (let i = 0; i < object.length; i++) {
//                     const item = object[i];
//                     const itemBox = getValueDisplay(this.snapshot, item, childMap, this.textMeasurer, this.context);
// 
//                     if (!itemBox.border) {
//                         itemBox.border = { color: VARIABLE_DISPLAY_COLOR };
//                     }
// 
//                     itemBox.text = " " + itemBox.text + " ";
//                     box.children.push(itemBox);
//                 }
//             } else { // it's a dictionary
//                 box = {
//                     type: "container",
//                     direction: "vertical",
//                     children: []
//                 };
// 
//                 const keys = Object.keys(object);
//                 if (keys.length === 0) {
//                     box.children.push(textBox("{}", CODE_COLOR));
//                 } else {
//                     const leftColumnWidth = Math.max(...keys.map((key) => key.length));
//                     const rightColumnWidth = Math.max(...keys.map((key) => getValueDisplayLength(object[key])));
//                     for (let prop in object) {
//                         const row: Box = horizontalBox();
//                         const propValue = object[prop];
// 
//                         if (leftColumnWidth) {
//                             row.children.push({
//                                 type: "text",
//                                 text: prop.padEnd(leftColumnWidth, " "),
//                                 color: VARIABLE_DISPLAY_COLOR,
//                                 border: { color: VARIABLE_DISPLAY_COLOR }
//                             });
//                         }
//                         const propValueBox = getValueDisplay(this.snapshot, propValue, childMap, this.textMeasurer, this.context);
//                         propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
//                         if (rightColumnWidth) {
//                             propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
//                         }
//                         box.children.push(row);
//                     }
//                 }
//             }
// 
//             const bboxMap = fitBox(
//                 box, bbox, viewport, 
//                 CODE_FONT_FAMILY, "normal", 
//                 true, this.textMeasurer, 
//                 CODE_LINE_HEIGHT, ctx, VARIABLE_DISPLAY_COLOR
//             );
// 
//             let childRenderables: Map<BoundingBox, ZoomRenderable> = new Map();
//             for (let [box, renderable] of childMap) {
//                 const childBBox = bboxMap.get(box);
//                 childRenderables.set(childBBox, renderable);
//             }
//             return childRenderables;
//         }
// 
//         return new Map();
//     }
// }

function isHeapRef(thing: any): boolean {
    return thing instanceof HeapRef;
}

function isObjectRef(thing: any): boolean {
    return thing instanceof Ref;
}

function hasHeapValueChanged(id: number, cache: DataCache, heapOne: number, heapTwo: number) {
    if (cache.heapLookup(heapOne, id) !== cache.heapLookup(heapTwo, id)) {
        return true;
    } else {
        const thingOne = cache.getHeapObject(heapOne, id);
        const thingTwo = cache.getHeapObject(heapTwo, id);
        if (Array.isArray(thingOne)) {
            if (thingOne.length !== thingTwo.length) {
                return true;
            }
            for (let i = 0; i < thingOne.length; i++) {
                if (thingOne[i] !== thingTwo[i]) {
                    return true;
                } else if (isHeapRef(thingOne[i])) {
                    if (hasHeapValueChanged(thingOne[i].id, cache, heapOne, heapTwo)) {
                        return true;
                    }
                }
            }
            return false;
        } else if (thingOne instanceof Map) {
            if (thingOne.size !== thingTwo.size) {
                return true;
            }
            for (let prop of thingOne.keys()) {
                const valueOne = thingOne.get(prop);
                const valueTwo = thingTwo.get(prop);
                if (valueOne !== valueTwo) {
                    return true;
                } else if (isHeapRef(valueOne)) {
                    if (hasHeapValueChanged(valueOne.id, cache, heapOne, heapTwo)) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            return false;
        }
    }
}

function getValueDisplay(
    snapshot: Snapshot,
    value: any, 
    childMap: Map<Box, ZoomRenderable>, 
    textMeasurer: TextMeasurer, 
    context: ZoomDebuggerContext
): TextBox {
    if (isHeapRef(value)) {
        // const textBox: TextBox = {
        //     type: "text",
        //     text: "*" + value.id,
        //     color: VARIABLE_DISPLAY_COLOR,
        //     border: {
        //         color: VARIABLE_DISPLAY_COLOR
        //     }
        // };

        // childMap.set(textBox, new HeapObjectRenderer(snapshot, value, textMeasurer, context));
        const display = getHeapObjectStringDisplay(snapshot, value, context);
        return textBox(display, VARIABLE_DISPLAY_COLOR);
    }
    const retval: TextBox = {
        type: "text",
        text: value === undefined ? "undefined" : JSON.stringify(value),
        color: VARIABLE_DISPLAY_COLOR
    };
    return retval;
}

function getHeapObjectStringDisplay(snapshot: Snapshot, value: any, context: ZoomDebuggerContext): string {
    if (value === null) {
        return "null";
    } else if (value === undefined) {
        return "undefined";
    } else if (isHeapRef(value)) {
        const cache = context.dataCache;
        const object = cache.getHeapObject(snapshot.heap, value.id);
        if (Array.isArray(object)) {
            return "[" + object.map((item) => {
                return getHeapObjectStringDisplay(snapshot, item, context);
            }).join(", ") + "]";
        } else if (object instanceof Map) {
            return "{" + Array.from(object.entries()).map(([key, value]) => {
                const keyDisplay = getHeapObjectStringDisplay(snapshot, key, context);
                const valueDisplay = getHeapObjectStringDisplay(snapshot, value, context);
                return keyDisplay + ": " + valueDisplay;
            }) + "}";
        } else {
            return JSON.stringify(object);
        }
    } else {
        return JSON.stringify(value);
    }
}

function getValueDisplayLength(value: any): number {
    if (value === undefined) {
        return 9;
    }
    if (isHeapRef(value)) {
        return String("*" + value.id).length;
    }
    return JSON.stringify(value).length;
}