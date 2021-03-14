import { ZoomRenderable, BoundingBox } from "./zui";
import { FunCall, Snapshot } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { ZoomDebuggerContext } from "./zoom-debugger";
import { DataCache } from "./data-cache";
import { ASTInfo } from "./ast-info";
const { Ref, HeapRef } = require("../json-like/json-like.js");

const CODE_LINE_HEIGHT = 1.5;
const CODE_FONT_FAMILY = "Monaco";
const LINE_NUMBER_COLOR = "#666666";
const CODE_COLOR = "black";
const VARIABLE_DISPLAY_COLOR = "#f0b155";

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
        const funNode = this.astInfo.getFunNode(funName);
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
        const funNode = this.astInfo.getFunNode(this.fun.name);
        
        const codeBox: Box = {
            type: "container",
            direction: "vertical",
            children: []
        };
        
        if (this.astInfo.hasSignature(funNode)) {
            // layout the function signature
            codeBox.children.push(this.layoutFunctionSignature(
                funNode, this.funCall, 0, childMap));
        }
        
        const snapshots = this.cache.getFunCallSnapshots(this.funCall.id);
        
        let currLineNo = snapshots[0].line_no;
        let currGroup = [snapshots[0]];
        
        const buildBox = (node: any, line: string, funCallIds: number[], top: boolean): Box => {
            const asIs = [
                "Constant", "ImportFrom", "Import", "Tuple",
                "Name", "List", "Delete", "Dict", "Try",
                "Subscript"
            ];
            let box: Box;
            if (node.type === "Expr") {
                box = buildBox(node.value, line, funCallIds, false);
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
                        const childBox = buildBox(arg, line, funCallIds, false);
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
            } else if (asIs.indexOf(node.type) !== -1) {
                box = textBox(line.substring(node.col_offset, node.end_col_offset), CODE_COLOR);
            } else if (node.type === "ClassDef") {
                box = textBox(line, CODE_COLOR);
            } else if (node.type === "FunctionDef") {
                box = textBox(line, CODE_COLOR);
            } else if (node.type === "If" || node.type === "For") {
                box = textBox(line.substring(node.col_offset), CODE_COLOR);
            } else if (node.type === "Assign") {
                const prefix = line.substring(node.col_offset, node.value.col_offset);
                const valueBox = buildBox(node.value, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(textBox(prefix, CODE_COLOR));
                box.children.push(valueBox);
            } else if (node.type === "Name" || node.type === "List" || node.type === "Delete") {
                box = textBox(line.substring(node.col_offset, node.end_col_offset), CODE_COLOR);
            } else if (node.type === "BinOp") {
                const leftBox = buildBox(node.left, line, funCallIds, false);
                const rightBox = buildBox(node.right, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(leftBox);
                box.children.push(textBox(line.substring(node.left.end_col_offset, node.right.col_offset), CODE_COLOR));
                box.children.push(rightBox);
            } else if (node.type === "Return") {
                const valueBox = buildBox(node.value, line, funCallIds, false);
                box = horizontalBox();
                box.children.push(textBox(line.substring(node.col_offset, node.value.col_offset), CODE_COLOR));
                box.children.push(valueBox);
            } else if (node.type instanceof Object && node.body) {
                // might be except handler
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
            }
            return box;
        }
        
        const commitCurrGroup = (nextSnapshot: Snapshot | null) => {
            const lineNo = currGroup[0].line_no;
            const line = this.codeInfo.codeLines[lineNo - 1];
            const statement = this.astInfo.getStatementOnLine(funNode, lineNo);
            const funCallIds = [];
            
            for (let snapshot of currGroup) {
                if (snapshot.start_fun_call_id !== null) {
                    funCallIds.push(snapshot.start_fun_call_id);
                }
            }
            
            const lineBox = horizontalBox();
            const box = buildBox(statement, line, funCallIds, true);
            lineBox.children.push(box);
            const valueDisplayStrings: TextBox[][] = [];
            
            const firstSnapshot = currGroup[0];
            nextSnapshot = nextSnapshot || currGroup[currGroup.length - 1];
            this.renderVariableAssignmentValues(firstSnapshot, funNode, this.funCall, nextSnapshot, childMap, valueDisplayStrings);
            this.renderUpdatedHeapObjects(funNode, this.funCall, firstSnapshot, nextSnapshot, childMap, valueDisplayStrings);
            this.renderReturnValues(funNode, this.funCall, firstSnapshot, nextSnapshot, childMap, valueDisplayStrings);
            
            if (valueDisplayStrings.length > 0) {
                lineBox.children.push({
                    type: "text",
                    text: "  "
                });
                lineBox.children.push(...valueDisplayStrings[0]);
                for (let i = 1; i < valueDisplayStrings.length; i++) {
                    const blankLineBox: Box = horizontalBox();
                    blankLineBox.children.push(...valueDisplayStrings[i]);
                    codeBox.children.push(blankLineBox);
                }
            }
            
            codeBox.children.push(lineBox);
            
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
        
        // console.log("end loop");
        
        return { codeBox, childMap };
        
        
    }

    getCodeBox2(
        funCall: FunCall,
        childEntries: Map<Snapshot, SubEntryGroup[]> = new Map()
    ): { codeBox: Box, childMap: Map<Box, ZoomRenderable> } {
        // rendering children
        const funName = this.fun.name;
        const funNode = this.astInfo.getFunNode(funName);
        if (!funNode) {
            throw new Error("Could not find funNode for " + funName);
        }
        const lineNumberWidth = 3;
        const childMap: Map<Box, ZoomRenderable> = new Map();

        const codeBox: Box = {
            type: "container",
            direction: "vertical",
            children: []
        };

        if (this.astInfo.hasSignature(funNode)) {
            // layout the function signature
            codeBox.children.push(this.layoutFunctionSignature(
                funNode, funCall, lineNumberWidth, childMap));
        }

        
        const snapshots = this.cache.getFunCallSnapshots(funCall.id);
        // Go through current entries and layout the code line by line
        for (let i = 0; i < snapshots.length; i++) {
            const entry = snapshots[i];
            const nextEntry = snapshots[i + 1];
            if (nextEntry && entry.line_no === nextEntry.line_no) {
                continue;
            }
            const line = this.codeInfo.codeLines[entry.line_no - 1];

            const lineNumberBox: TextBox = {
                type: "text",
                text: String(entry.line_no).padEnd(lineNumberWidth) + "  ",
                color: LINE_NUMBER_COLOR
            };
            const lineBox: ContainerBox = {
                type: "container",
                direction: "horizontal",
                children: [
                    lineNumberBox
                ]
            };

            this.renderLine(line, entry, lineBox, childEntries, childMap);

            const valueDisplayStrings: TextBox[][] = [];

            codeBox.children.push(lineBox);

            if (valueDisplayStrings.length > 0) {
                lineBox.children.push({
                    type: "text",
                    text: "  "
                });
                lineBox.children.push(...valueDisplayStrings[0]);
                for (let i = 1; i < valueDisplayStrings.length; i++) {
                    const blankLineBox: Box = {
                        type: "container",
                        direction: "horizontal",
                        children: []
                    };
                    blankLineBox.children.push({
                        type: "text",
                        text: "".padStart(lineNumberWidth + line.length + 4)
                    });
                    blankLineBox.children.push(...valueDisplayStrings[i]);
                    codeBox.children.push(blankLineBox);
                }
            }


        }

        return {
            codeBox,
            childMap
        };
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

    renderVariableAssignmentValues(snapshot: Snapshot, funNode: any, funCall: FunCall, nextSnapshot: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        // Display variable values for assignments

        const varName = this.astInfo.getVarAssignmentOnLine(funNode, snapshot.line_no);
        if (varName) {
            if (nextSnapshot) {
                let varValue: any;
                const locals = this.cache.getHeapObject(nextSnapshot.heap, funCall.locals);
                if (locals.has(varName)) {
                    varValue = locals.get(varName);
                }
                if (funCall.globals) {
                    const globals = this.context.dataCache.getHeapObject(nextSnapshot.heap, funCall.globals);
                    if (globals.has(varName)) {
                        varValue = globals.get(varName);
                    }
                }
                if (funCall.closure_cellvars) {
                    const cellvars = funCall.closure_cellvars;
                    if (cellvars.has(varName)) {
                        varValue = cellvars.get(varName);
                        if (isHeapRef(varValue)) {
                            varValue = this.context.dataCache.getHeapObject(nextSnapshot.heap, varValue.id);
                            varValue = varValue.get("ob_ref");
                        }
                    }
                }
                if (funCall.closure_freevars) {
                    const freevars = funCall.closure_freevars;
                    if (freevars.has(varName)) {
                        varValue = freevars.get(varName);
                        if (isHeapRef(varValue)) {
                            varValue = this.context.dataCache.getHeapObject(nextSnapshot.heap, varValue.id);
                            varValue = varValue.get("ob_ref");
                        }
                    }
                }
                const varValueDisplay = this.getVarValueDisplay(nextSnapshot, varValue, childMap);
                const prefix = `${varName} = `;
                const tboxes: Box[][] = varValueDisplay.map((boxes, idx) => {
                    if (idx === 0) {
                        return [
                            {
                                type: "text",
                                text: prefix,
                                color: VARIABLE_DISPLAY_COLOR
                            } as TextBox,
                            ...boxes
                        ];
                    } else {
                        return [
                            {
                                type: "text",
                                text: Array(prefix.length + 1).join(" ")
                            } as TextBox,
                            ...boxes
                        ]
                    }
                });
                valueDisplayStrings.push(...tboxes);
            }
        }
        return [];
    }

    renderUpdatedHeapObjects(funNode: any, funCallExpanded: FunCall, entry: Snapshot, nextEntry: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        let varNameAssigned = this.astInfo.getVarAssignmentOnLine(funNode, entry.line_no);
        const locals = funCallExpanded.locals;
        if (nextEntry) {
            const nextVariables = this.context.dataCache.getHeapObject(nextEntry.heap, locals);
            const currentVariables = this.context.dataCache.getHeapObject(entry.heap, locals);

            for (let varName of currentVariables.keys()) {
                if (varName === varNameAssigned) {
                    continue;
                }
                const value = currentVariables.get(varName);
                if (isHeapRef(value)) {
                    const nextValue = nextVariables.get(varName);
                    const headValueChanged = hasHeapValueChanged(value.id, this.context.dataCache, entry.heap, nextEntry.heap);
                    
                    if (!nextValue || headValueChanged) {
                        const varValueDisplay = this.getVarValueDisplay(nextEntry, nextValue, childMap);
                        const taggedVarValueDisplay: Box[][] = varValueDisplay.map((line, idx) => {
                            if (idx === 0) {
                                return [
                                    textBox(`${varName} = `, VARIABLE_DISPLAY_COLOR),
                                    ...line
                                ];
                            } else {
                                return [
                                    textBox(Array(`${varName} = `.length + 1).join(" "), VARIABLE_DISPLAY_COLOR),
                                    ...line
                                ];;
                            }
                        });
                        valueDisplayStrings.push(...taggedVarValueDisplay);
                    }
                }
            }
        }    
    }

    renderReturnValues(
        funNode: any, 
        funCall: FunCall,
        entry: Snapshot, 
        nextEntry: Snapshot, 
        childMap: Map<Box, ZoomRenderable>,
        valueDisplayStrings: Box[][]
    ) {
        // Display variable values for return statements
        const returnStatement = this.astInfo.getReturnStatementOnLine(funNode, entry.line_no);

        if (returnStatement) {
            const entryToUse = nextEntry || entry;
            const variables = this.context.dataCache.getHeapObject(entryToUse.heap, funCall.locals);
            const varValue = variables.get("<ret val>");
            const valueDisplay = this.getVarValueDisplay(entryToUse, varValue, childMap);
            const tagged: Box[][] = valueDisplay.map((line, idx) => {
                if (idx === 0) {
                    return [ textBox(`<ret val> = `, VARIABLE_DISPLAY_COLOR), ...line ];
                } else {
                    return [ textBox(Array(`<ret val> = `.length + 1).join(" "), VARIABLE_DISPLAY_COLOR), ...line ];
                }
            });
            valueDisplayStrings.push(...tagged);
        }
    }

    layoutFunctionSignature(funNode: any, funCall: FunCall, lineNumberWidth: number, childMap: Map<Box, ZoomRenderable>) {
        const startPos = this.astInfo.getStartPos(funNode);
        const funSigBox: ContainerBox = {
            type: "container",
            direction: "horizontal",
            children: [
                // {
                //     type: "text",
                //     text: String(startPos.line).padEnd(lineNumberWidth) + "  ",
                //     color: LINE_NUMBER_COLOR
                // },
                {
                    type: "text",
                    text: this.codeInfo.codeLines[startPos.line - 1],
                    color: CODE_COLOR
                }
            ]
        };
        const snapshot = this.cache.getFunCallSnapshots(funCall.id)[0];
        const variables = this.context.dataCache.getHeapObject(snapshot.heap, funCall.locals);
        const parameters = this.astInfo.getFunNodeParameters(funNode);
        for (let paramName of parameters) {
            let value = variables.get(paramName);
            const rows = this.getVarValueDisplay(snapshot, value, childMap);
            funSigBox.children.push({
                type: "text",
                text: `  ${paramName} = `,
                color: VARIABLE_DISPLAY_COLOR
            });
            const outerBox: Box = {
                type: "container",
                direction: "vertical",
                children: rows.map((cells) => ({
                    type: "container",
                    direction: "horizontal",
                    children: cells
                }))
            } as Box;
            funSigBox.children.push(outerBox);
        }

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
    return cache.heapLookup(heapOne, id) !== cache.heapLookup(heapTwo, id);
    // if (cache.heapLookup(heapOne, id) !== cache.heapLookup(heapTwo, id)) {
    //     return true;
    // } else {
    //     const thingOne = cache.getHeapObject(heapOne, id);
    //     const thingTwo = cache.getHeapObject(heapTwo, id);
    //     if (Array.isArray(thingOne)) {
    //         if (thingOne.length !== thingTwo.length) {
    //             return true;
    //         }
    //         for (let i = 0; i < thingOne.length; i++) {
    //             if (thingOne[i] !== thingTwo[i]) {
    //                 return true;
    //             } else if (isHeapRef(thingOne[i])) {
    //                 if (hasHeapValueChanged(thingOne[i].id, cache, heapOne, heapTwo)) {
    //                     return true;
    //                 }
    //             }
    //         }
    //         return false;
    //     } else if (thingOne instanceof Map) {
    //         if (thingOne.size !== thingTwo.size) {
    //             return true;
    //         }
    //         for (let prop of thingOne.keys()) {
    //             const valueOne = thingOne.get(prop);
    //             const valueTwo = thingTwo.get(prop);
    //             if (valueOne !== valueTwo) {
    //                 return true;
    //             } else if (isHeapRef(valueOne)) {
    //                 if (hasHeapValueChanged(valueOne.id, cache, heapOne, heapTwo)) {
    //                     return true;
    //                 }
    //             }
    //         }
    //         return false;
    //     } else {
    //         return false;
    //     }
    // }
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