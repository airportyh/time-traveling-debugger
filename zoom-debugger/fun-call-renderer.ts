import { parse } from "../play-lang/src/parser";
import { ZoomRenderable, BoundingBox } from "./zui";
import { FunCall, DBObject, Snapshot, FunCallExpanded } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { ZoomDebuggerContext } from "./zoom-debugger";
import { DataCache, CodeInfo } from "./data-cache";
import { ASTInfo } from "./ast-info";
import { fetchJson } from "./fetch-json";
import { PythonASTInfo } from "./python-ast-info";
import { PlayLangASTInfo } from "./play-lang-ast-info";
const { Ref, HeapRef, parse } = require("../json-like/json-like.js");

const CODE_LINE_HEIGHT = 1.5;
const CODE_FONT_FAMILY = "Monaco";
const LINE_NUMBER_COLOR = "#666666";
const CODE_COLOR = "black";
const VARIABLE_DISPLAY_COLOR = "#f0b155";
const HEAP_REF_COLOR = "#119af5";

type SubEntryGroup = {
    callExpr: any,
    funCall: FunCall
};

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
    
    id(): string {
        return String(this.funCall.id);
    }
    
    hoverable(): boolean {
        return false;
    }
    
    get astInfo(): ASTInfo {
        return this.codeInfo?.astInfo;
    }
    
    lazyInit(): boolean {
        if (this.codeInfo) {
            return true;
        } else {
            const codeInfo = this.context.dataCache.getCodeInfo(this.funCall.code_file_id);
            if (codeInfo) {
                this.codeInfo = codeInfo;
                if (this.callExpr === this.codeInfo.ast) {
                    // main()
                    this.callExprCode = "main()";
                } else {
                    this.callExprCode = this.codeInfo.astInfo.getSource(this.callExpr);
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
        const funName = this.funCall.fun_name;
        const funNode = this.astInfo.getFunNode(funName);
        if (!funNode) {
            console.log("Could not find funNode for", funName, "in", this.callExpr);
        }
        
        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
        
        if (myAreaRatio >= 0.4) {
            const funCallExpanded = this.context.dataCache.getFunCallExpanded(this.funCall.id);
            
            if (funCallExpanded) {
                const childCallMap = this.buildChildCallMap(funNode, funCallExpanded);
                
                const { codeBox, childMap } = this.getCodeBox(
                    funCallExpanded, childCallMap
                );
                
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

    getCodeBox(
        funCallExpanded: FunCallExpanded,
        childEntries: Map<Snapshot, SubEntryGroup[]>
    ): { codeBox: Box, childMap: Map<Box, ZoomRenderable> } {
        // rendering children
        const funName = this.funCall.fun_name;
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
                funNode, funCallExpanded, lineNumberWidth, childMap));
        }
        
        const snapshots = funCallExpanded.snapshots;
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
            
            this.renderVariableAssignmentValues(entry, funNode, funCallExpanded, nextEntry, childMap, valueDisplayStrings);
            this.renderUpdatedHeapObjects(funNode, funCallExpanded, entry, nextEntry, childMap, valueDisplayStrings);
            this.renderReturnValues(funNode, funCallExpanded, entry, nextEntry, childMap, valueDisplayStrings);
            
            /*
            for (let callExprNode of callExprNodes) {
                const myChildEntries = childEntries.get(callExprNode);
                if (!myChildEntries) {
                    continue;
                }
                const lastChildEntry = myChildEntries[myChildEntries.length - 1];
                const lastChildEntryStackFrame = lastChildEntry.stack[lastChildEntry.stack.length - 1];
                
                // This detects if the function never returned
                if (!("<ret val>" in lastChildEntryStackFrame.variables)) {
                    continue;
                }
                
                const funName = lastChildEntryStackFrame.funName;
                const funDefNode = findNodesOfType(ast, "function_definition").find(node => node.name.value === funName);
                const parameterList = funDefNode.parameters.map(param => {
                    const paramName = param.value;
                    const paramValue = lastChildEntryStackFrame.parameters[paramName];
                    if (isHeapRef(paramValue)) {
                        return paramValue.id;
                    } else {
                        return paramValue;
                    }
                });
                const callExprCode = funName + "(" + parameterList + ")";
                const retVal = String(lastChildEntryStackFrame.variables["<ret val>"]);
                const actualCallExprBox: TextBox = {
                    type: "text",
                    text: callExprCode,
                    color: VARIABLE_DISPLAY_COLOR
                };
                childMap.set(actualCallExprBox, new CodeScopeRenderer(
                    childEntries.get(callExprNode),
                    callExprCode,
                    this.ast,
                    this.code,
                    this.textMeasurer
                ));
                valueDisplayStrings.push([
                    actualCallExprBox,
                    {
                        type: "text",
                        text: ` = `,
                        color: VARIABLE_DISPLAY_COLOR
                    },
                    {
                        type: "text",
                        text: retVal,
                        color: VARIABLE_DISPLAY_COLOR
                    }
                ]);
            }
            */
            
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
    
    buildChildCallMap(funNode: any, funCallExpanded: FunCallExpanded): Map<Snapshot, SubEntryGroup[]> {
        const childCallMap: Map<Snapshot, SubEntryGroup[]> = new Map();
        let childFunCallIdx = 0;
        for (let i = 0; i < funCallExpanded.snapshots.length; i++) {
            const snapshot = funCallExpanded.snapshots[i];
            const nextSnapshot = funCallExpanded.snapshots[i + 1];
            if (nextSnapshot && snapshot.line_no === nextSnapshot.line_no) {
                continue;
            }
            let callExprs: any[] = this.astInfo.getCallExpressionsOnLine(funNode, snapshot.line_no);
            callExprs = callExprs.filter(expr => this.userDefinedFunctionNames.includes(this.astInfo.getFunNameForCallExpr(expr)));
            for (let j = 0; j < callExprs.length; j++) {
                const callExpr = callExprs[j];
                if (!childCallMap.has(snapshot)) {
                    childCallMap.set(snapshot, []);
                }
                const funCall = funCallExpanded.childFunCalls[childFunCallIdx++];
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
                console.log(subEntryGroup);
                throw new Error("Y NO FUN CALL?");
            }
            childMap.set(
                callExprTextBox, 
                new FunCallRenderer(
                    subEntryGroup.funCall,
                    callExprNode,
                    this.astInfo,
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
    
    
    renderVariableAssignmentValues(snapshot: Snapshot, funNode: any, funCallExpanded: FunCallExpanded, nextSnapshot: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        // Display variable values for assignments
        
        const varName = this.astInfo.getVarAssignmentOnLine(funNode, snapshot.line_no);
        if (varName) {
            if (nextSnapshot) {
                let varValue: any;
                const locals = this.context.dataCache.getObject(
                    funCallExpanded.heapMap[nextSnapshot.heap + "/" + funCallExpanded.locals]);
                if (locals.has(varName)) {
                    varValue = locals.get(varName);
                }
                if (funCallExpanded.globals) {
                    const globals = this.context.dataCache.getObject(
                        funCallExpanded.heapMap[nextSnapshot.heap + "/" + funCallExpanded.globals]);
                    if (globals.has(varName)) {
                        varValue = globals.get(varName);
                    }
                }
                if (funCallExpanded.closure_cellvars) {
                    const cellvars = funCallExpanded.closure_cellvars;
                    if (cellvars.has(varName)) {
                        varValue = cellvars.get(varName);
                        if (isHeapRef(varValue)) {
                            varValue = this.context.dataCache.getObject(
                                funCallExpanded.heapMap[nextSnapshot.heap + "/" + varValue.id]);
                            varValue = varValue.get("ob_ref");
                        }
                    }
                }
                if (funCallExpanded.closure_freevars) {
                    const freevars = funCallExpanded.closure_freevars;
                    if (freevars.has(varName)) {
                        varValue = freevars.get(varName);
                        if (isHeapRef(varValue)) {
                            varValue = this.context.dataCache.getObject(
                                funCallExpanded.heapMap[nextSnapshot.heap + "/" + varValue.id]);
                            varValue = varValue.get("ob_ref");
                        }
                    }
                }
                const varValueDisplay = this.getVarValueDisplay(nextSnapshot, varValue, childMap, funCallExpanded.heapMap);
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
    
    renderUpdatedHeapObjects(funNode: any, funCallExpanded: FunCallExpanded, entry: Snapshot, nextEntry: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        let varNameAssigned = this.astInfo.getVarAssignmentOnLine(funNode, entry.line_no);
        const locals = funCallExpanded.locals;
        const heapMap = funCallExpanded.heapMap;
        if (nextEntry) {
            // const currentHeap = this.context.dataCache.getObject(entry.heap);
            // const nextHeap = this.context.dataCache.getObject(nextEntry.heap);
            // const nextVariables = this.context.dataCache.getObject(funCallExpanded.heapMap[nextEntry.heap + "/" + locals]);
            // const currentVariables = this.context.dataCache.getObject(funCallExpanded.heapMap[entry.heap + "/" + locals]);
            const nextVariables = this.context.dataCache.getObject(heapMap[nextEntry.heap + "/" + locals]);
            const currentVariables = this.context.dataCache.getObject(heapMap[entry.heap + "/" + locals]);
            
            for (let varName of currentVariables.keys()) {
                if (varName === varNameAssigned) {
                    continue;
                }
                const value = currentVariables.get(varName);
                if (isHeapRef(value)) {
                    const nextValue = nextVariables.get(varName);
                    const headValueChanged = hasHeapValueChanged(value.id, this.context.dataCache, heapMap, entry.heap, nextEntry.heap);
                    if (!nextValue || 
                        (isHeapRef(value) && (
                        (value.id !== nextValue.id) || headValueChanged))) {
                        const varValueDisplay = this.getVarValueDisplay(entry, nextValue, childMap, heapMap);
                        const taggedVarValueDisplay: Box[][] = varValueDisplay.map((line, idx) => {
                            if (idx === 0) {
                                return [
                                    {
                                        type: "text",
                                        text: `${varName} = `,
                                        color: VARIABLE_DISPLAY_COLOR
                                    } as TextBox,
                                    ...line
                                ];
                            } else {
                                return [
                                    {
                                        type: "text",
                                        text: Array(`${varName} = `.length + 1).join(" "),
                                        color: VARIABLE_DISPLAY_COLOR
                                    } as TextBox,
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
        funCallExpanded: FunCallExpanded,
        entry: Snapshot, 
        nextEntry: Snapshot, 
        childMap: Map<Box, ZoomRenderable>,
        valueDisplayStrings: Box[][]
    ) {
        // Display variable values for return statements
        const returnStatement = this.astInfo.getReturnStatementOnLine(funNode, entry.line_no);
        
        if (returnStatement) {
            const entryToUse = nextEntry || entry;
            const variables = this.context.dataCache.getObject(funCallExpanded.heapMap[entryToUse.heap + "/" + funCallExpanded.locals]);
            const varValue = variables.get("<ret val>");
            const valueDisplay = this.getVarValueDisplay(entryToUse, varValue, childMap, funCallExpanded.heapMap);
            const tagged: Box[][] = valueDisplay.map((line, idx) => {
                if (idx === 0) {
                    return [
                        {
                            type: "text",
                            text: `<ret val> = `,
                            color: VARIABLE_DISPLAY_COLOR
                        },
                        ...line
                    ];
                } else {
                    return [
                        {
                            type: "text",
                            text: Array(`<ret val> = `.length + 1).join(" "),
                            color: VARIABLE_DISPLAY_COLOR
                        } as TextBox,
                        ...line
                    ]
                }
            });
            valueDisplayStrings.push(...tagged);
        }
    }

    layoutFunctionSignature(funNode: any, funCallExpanded: FunCallExpanded, lineNumberWidth: number, childMap: Map<Box, ZoomRenderable>) {
        const startPos = this.astInfo.getStartPos(funNode);
        const funSigBox: ContainerBox = {
            type: "container",
            direction: "horizontal",
            children: [
                {
                    type: "text",
                    text: String(startPos.line).padEnd(lineNumberWidth) + "  ",
                    color: LINE_NUMBER_COLOR
                },
                {
                    type: "text",
                    text: this.codeInfo.codeLines[startPos.line - 1],
                    color: CODE_COLOR
                }
            ]
        };
        const snapshot = funCallExpanded.snapshots[0];
        const variables = this.context.dataCache.getObject(funCallExpanded.heapMap[snapshot.heap + "/" + funCallExpanded.locals]);
        const parameters = this.astInfo.getFunNodeParameters(funNode);
        for (let paramName of parameters) {
            let value = variables.get(paramName);
            const rows = this.getVarValueDisplay(snapshot, value, childMap, funCallExpanded.heapMap);
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
    
    getVarValueDisplay(snapshot: Snapshot, value: any, childMap: Map<Box, ZoomRenderable>, heapMap: any): Box[][] {
        let objectId: any = null;
        if (isObjectRef(value)) {
            objectId = value.id;
            value = this.context.dataCache.getObject(value.id);
        }
        if (isHeapRef(value)) {
            let object = this.context.dataCache.getObject(heapMap[snapshot.heap + "/" + value.id]);
            if (object === undefined) {
                throw new Error("Could not find entry in heap map for: " + snapshot.heap + "/" + value.id);
            }
            if (typeof object === "string") {
                return [[getValueDisplay(snapshot, object, childMap, heapMap, this.context.textMeasurer)]];
            } else if (Array.isArray(object)) {
                const row: Box[] = [];
                for (let i = 0; i < object.length; i++) {
                    const item = object[i];
                    const itemBox = getValueDisplay(snapshot, item, childMap, heapMap, this.context.textMeasurer);
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
                    const propTextBox: TextBox = {
                        type: "text",
                        text: prop.padEnd(leftColumnWidth, " "),
                        color: VARIABLE_DISPLAY_COLOR,
                        border: { color: VARIABLE_DISPLAY_COLOR }
                    };
                    const propValueBox = getValueDisplay(snapshot, propValue, childMap, heapMap, this.context.textMeasurer);
                    propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
                    table.push([propTextBox, propValueBox]);
                }
                return table;
            }
        }
        return [[getValueDisplay(snapshot, value, childMap, heapMap, this.context.textMeasurer)]];
    }
    
}

class HeapObjectRenderer implements ZoomRenderable {
    constructor(
        public snapshot: Snapshot,
        public value: any, 
        public textMeasurer: TextMeasurer, 
        public heap: any) {
    }
    
    id(): string {
        return `heapObject[${this.snapshot.id},${this.value.id}]`;
    }
    
    hoverable(): boolean {
        return true;
    }
    
    render(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        viewport: BoundingBox
    ): Map<BoundingBox, ZoomRenderable> {
        const childMap: Map<Box, ZoomRenderable> = new Map();
        const myArea = bbox.width * bbox.height;
        const myAreaRatio = myArea / (viewport.width * viewport.height);
        if (myAreaRatio > 0.0005) {
            ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
            const object = this.heap[this.value.id];
            let box: Box;
            if (Array.isArray(object)) {
                box = {
                    type: "container",
                    direction: "horizontal",
                    children: []
                };
                for (let i = 0; i < object.length; i++) {
                    const item = object[i];
                    const itemBox = getValueDisplay(this.snapshot, item, childMap, this.heap, this.textMeasurer);
                    itemBox.text = " " + itemBox.text + " ";
                    box.children.push(itemBox);
                }
            } else { // it's a dictionary
                box = {
                    type: "container",
                    direction: "vertical",
                    children: []
                };
                const leftColumnWidth = Math.max(...Object.keys(object).map((key) => key.length));
                const rightColumnWidth = Math.max(...Object.keys(object).map((key) => getValueDisplayLength(object[key])));
                for (let prop in object) {
                    const propValue = object[prop];
                    const propTextBox: TextBox = {
                        type: "text",
                        text: prop.padEnd(leftColumnWidth, " "),
                        color: VARIABLE_DISPLAY_COLOR,
                        border: { color: VARIABLE_DISPLAY_COLOR }
                    };
                    const propValueBox = getValueDisplay(this.snapshot, propValue, childMap, this.heap, this.textMeasurer);
                    propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
                    const row: Box = {
                        type: "container",
                        direction: "horizontal",
                        children: [
                            propTextBox,
                            propValueBox
                        ]
                    };
                    box.children.push(row);
                }
            }
            
            const bboxMap = fitBox(
                box, bbox, viewport, 
                CODE_FONT_FAMILY, "normal", 
                true, this.textMeasurer, 
                CODE_LINE_HEIGHT, ctx, VARIABLE_DISPLAY_COLOR
            );
            
            let childRenderables: Map<BoundingBox, ZoomRenderable> = new Map();
            for (let [box, renderable] of childMap) {
                const childBBox = bboxMap.get(box);
                childRenderables.set(childBBox, renderable);
            }
            return childRenderables;
        }
        
        return new Map();
    }
}



function isHeapRef(thing): boolean {
    return thing instanceof HeapRef;
}

function isObjectRef(thing): boolean {
    return thing instanceof Ref;
}

function hasHeapValueChanged(id: number, dataCache: DataCache, heapMap: any, heapOne: number, heapTwo: number) {
    if (heapMap[heapOne + "/" + id] !== heapMap[heapTwo + "/" + id]) {
        return true;
    } else {
        const thingOne = dataCache.getObject(heapMap[heapOne + "/" + id]);
        const thingTwo = dataCache.getObject(heapMap[heapTwo + "/" + id]);;
        if (Array.isArray(thingOne)) {
            if (thingOne.length !== thingTwo.length) {
                return true;
            }
            for (let i = 0; i < thingOne.length; i++) {
                if (thingOne[i] !== thingTwo[i]) {
                    return true;
                } else if (isHeapRef(thingOne[i])) {
                    if (hasHeapValueChanged(thingOne[i].id, dataCache, heapMap, heapOne, heapTwo)) {
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
                    if (hasHeapValueChanged(valueOne.id, dataCache, heapMap, heapOne, heapTwo)) {
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
    heap: any,
    textMeasurer: TextMeasurer): TextBox {
    if (isHeapRef(value)) {
        const textBox: TextBox = {
            type: "text",
            text: "*" + value.id,
            color: VARIABLE_DISPLAY_COLOR,
            border: {
                color: VARIABLE_DISPLAY_COLOR
            }
        };
        
        childMap.set(textBox, new HeapObjectRenderer(snapshot, value, textMeasurer, heap));
        return textBox;
    }
    const retval: TextBox = {
        type: "text",
        text: value === undefined ? "undefined" : JSON.stringify(value),
        color: VARIABLE_DISPLAY_COLOR
    };
    return retval;
}

function getValueDisplayLength(value: any): number {
    if (isHeapRef(value)) {
        return String("*" + value.id).length;
    }
    return JSON.stringify(value).length;
}