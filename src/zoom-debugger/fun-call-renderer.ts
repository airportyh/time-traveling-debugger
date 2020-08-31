import { ZoomRenderable, BoundingBox } from "./zui";
import { FunCall, DBObject, Snapshot, FunCallExpanded } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { traverse } from "../traverser";
import { ZoomDebuggerContext } from "./zoom-debugger";
import { Ref } from "@airportyh/jsonr";

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

type HeapRef = { id: number };

export class FunCallRenderer implements ZoomRenderable {
    funCall: FunCall;
    callExpr: any;
    callExprCode: string;
    context: ZoomDebuggerContext;
    
    userDefinedFunctionNames: string[];
    
    constructor(
        funCall: FunCall, 
        callExpr: any, 
        context: ZoomDebuggerContext) {
        this.funCall = funCall;
        this.callExpr = callExpr;
        if (callExpr === context.ast) {
            // main()
            this.callExprCode = "main()";
        } else {
            const line = context.codeLines[callExpr.start.line - 1];
            const startIdx = callExpr.start.col;
            const endIdx = callExpr.end.col;
            const callExprCode = line.slice(startIdx, endIdx);
            this.callExprCode = callExprCode;
        }
        this.context = context;
        const userDefinedFunctions = findNodesOfType(this.context.ast, "function_definition");
        this.userDefinedFunctionNames = userDefinedFunctions.map(fun => fun.name.value);
    }
    
    id(): string {
        return String(this.funCall.id);
    }
    
    hoverable(): boolean {
        return false;
    }
    
    render(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        viewport: BoundingBox
    ): Map<BoundingBox, ZoomRenderable> {
        // TODO: move this logic to container
        if (bbox.x + bbox.width < viewport.x ||
            bbox.y + bbox.height < viewport.y ||
            bbox.x > viewport.width ||
            bbox.y > viewport.height) {
            return new Map();
        }
        const myArea = bbox.width * bbox.height;
        const myAreaRatio = myArea / (viewport.width * viewport.height);
        //const stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        const funName = this.funCall.fun_name;
        const funNode = findFunction(this.context.ast, funName);
        if (!funNode) {
            console.log("Could not find funNode for", funName, "in", this.callExpr);
        }
        
        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);

        const funCallExpanded = this.context.dataCache.getFunCallExpanded(this.funCall.id);

        if (funCallExpanded && myAreaRatio >= 0.4) {
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
        
        } else {
            const textBox: TextBox = {
                type: "text",
                text: this.callExprCode
            };
            fitBox(textBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, this.context.textMeasurer, CODE_LINE_HEIGHT, ctx);
            return new Map();
        }
    }

    getCodeBox(
        funCallExpanded: FunCallExpanded,
        childEntries: Map<Snapshot, SubEntryGroup[]>
        ): { codeBox: Box, childMap: Map<Box, ZoomRenderable> } {
        // rendering children
        const funName = this.funCall.fun_name;
        const funNode = findFunction(this.context.ast, funName);
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
        // layout the function signature
        codeBox.children.push(this.layoutFunctionSignature(
            funNode, funCallExpanded, lineNumberWidth, childMap));
        
        const snapshots = funCallExpanded.snapshots;
        // Go through current entries and layout the code line by line
        for (let i = 0; i < snapshots.length; i++) {
            const entry = snapshots[i];
            const nextEntry = snapshots[i + 1];
            if (nextEntry && entry.line_no === nextEntry.line_no) {
                continue;
            }
            const line = this.context.codeLines[entry.line_no - 1];
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
            
            this.renderVariableAssignmentValues(entry, funNode, nextEntry, childMap, valueDisplayStrings);
            this.renderUpdatedHeapObjects(funNode, entry, nextEntry, childMap, valueDisplayStrings);
            this.renderReturnValues(funNode, entry, nextEntry, childMap, valueDisplayStrings);
            
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
            let callExprs: any[] = 
                findNodesOfTypeOnLine(funNode, "call_expression", snapshot.line_no);
            callExprs = callExprs.filter(expr => this.userDefinedFunctionNames.includes(expr.fun_name.value));
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
            const startIdx = callExprNode.start.col;
            const endIdx = callExprNode.end.col;
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
    
    
    renderVariableAssignmentValues(snapshot: Snapshot, funNode: any, nextSnapshot: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        // Display variable values for assignments
        const assignmentNode = findNodesOfTypeOnLine(funNode, "var_assignment", snapshot.line_no)[0];
        if (assignmentNode) {
            const varName = assignmentNode.var_name.value;
            if (nextSnapshot) {
                const stack = this.context.dataCache.getObject(nextSnapshot.stack);
                const heap = this.context.dataCache.getObject(nextSnapshot.heap);
                const nextStackFrame = this.deref(stack[0]);
                const variables = this.deref(nextStackFrame.variables);
                const varValue = variables[varName];
                const varValueDisplay = this.getVarValueDisplay(snapshot.id, varValue, childMap, heap);
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
    
    renderUpdatedHeapObjects(funNode: any, entry: Snapshot, nextEntry: Snapshot, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        let varNameAssigned: any;
        const assignmentNode = findNodesOfTypeOnLine(funNode, "var_assignment", entry.line_no)[0];
        if (assignmentNode) {
            varNameAssigned = assignmentNode.var_name.value;
        }
        if (nextEntry) {
            const currentHeap = this.context.dataCache.getObject(entry.heap);
            const nextHeap = this.context.dataCache.getObject(nextEntry.heap);
            const nextStack = this.context.dataCache.getObject(nextEntry.stack);
            const currentStack = this.context.dataCache.getObject(entry.stack);
            const nextFrame = this.deref(nextStack[0]);
            const currentFrame = this.deref(currentStack[0]);
            const nextVariables = this.deref(nextFrame.variables);
            const currentVariables = this.deref(currentFrame.variables);
            for (let varName in currentVariables) {
                if (varName === varNameAssigned) {
                    continue;
                }
                const value = currentVariables[varName];
                if (isHeapRef(value)) {
                    const nextValue = nextVariables[varName];
                    const headValueChanged = hasHeapValueChanged(value.id, currentHeap, nextHeap);
                    if (!nextValue || 
                        (isHeapRef(value) && (
                        (value.id !== nextValue.id) || headValueChanged))) {
                        const varValueDisplay = this.getVarValueDisplay(entry.id, nextValue, childMap, nextHeap);
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
        entry: Snapshot, 
        nextEntry: Snapshot, 
        childMap: Map<Box, ZoomRenderable>,
        valueDisplayStrings: Box[][]
    ) {
        // Display variable values for return statements
        const returnStatement = findNodesOfTypeOnLine(funNode, "return_statement", entry.line_no)[0];
        
        if (returnStatement) {
            const stack = this.context.dataCache.getObject(nextEntry.stack);
            const heap = this.context.dataCache.getObject(nextEntry.heap);
            const nextStackFrame = this.deref(stack[0]);
            const variables = this.deref(nextStackFrame.variables);
            const varValue = variables["<ret val>"];
            const valueDisplay = this.getVarValueDisplay(entry.id, varValue, childMap, heap);
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
        const funSigBox: ContainerBox = {
            type: "container",
            direction: "horizontal",
            children: [
                {
                    type: "text",
                    text: String(funNode.start.line).padEnd(lineNumberWidth) + "  ",
                    color: LINE_NUMBER_COLOR
                },
                {
                    type: "text",
                    text: this.context.codeLines[funNode.start.line - 1],
                    color: CODE_COLOR
                }
            ]
        };
        const snapshot = funCallExpanded.snapshots[0];
        const stack = this.context.dataCache.getObject(snapshot.stack);
        const heap = this.context.dataCache.getObject(snapshot.heap);
        const stackFrame = this.deref(stack[0]);
        const variables = this.deref(stackFrame.variables);
        
        for (let param of funNode.parameters) {
            const paramName = param.value;
            let value = variables[paramName];
            const rows = this.getVarValueDisplay(snapshot.id, value, childMap, heap);
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
    
    getVarValueDisplay(snapshotId: number, value: any, childMap: Map<Box, ZoomRenderable>, heap: any): Box[][] {
        let objectId = null;
        if (isJsonrRef(value)) {
            objectId = value.id;
            value = this.context.dataCache.getObject(value.id);
        }
        if (isHeapRef(value)) {
            if (isJsonrRef(heap)) {
                heap = this.context.dataCache.getObject(heap.id);
            }
            let object = heap[value.id];
            if (object === undefined) {
                console.warn("Object is undefined for", value, heap);
                throw new Error("Object is undefined");
            }
            if (isJsonrRef(object)) {
                object = this.context.dataCache.getObject(object.id);
            }
            if (Array.isArray(object)) {
                const row: Box[] = [];
                for (let i = 0; i < object.length; i++) {
                    const item = object[i];
                    const itemBox = getValueDisplay(snapshotId, item, childMap, heap, this.context.textMeasurer);
                    itemBox.text = " " + itemBox.text + " ";
                    if (!itemBox.border) {
                        itemBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    }
                    row.push(itemBox);
                }
                return [row];
            } else { // it's a dictionary
                const leftColumnWidth = Math.max(...Object.keys(object).map((key) => key.length));
                const rightColumnWidth = Math.max(...Object.keys(object).map((key) => getValueDisplayLength(object[key])));
                const table: Box[][] = [];
                for (let prop in object) {
                    const propValue = object[prop];
                    const propTextBox: TextBox = {
                        type: "text",
                        text: prop.padEnd(leftColumnWidth, " "),
                        color: VARIABLE_DISPLAY_COLOR,
                        border: { color: VARIABLE_DISPLAY_COLOR }
                    };
                    const propValueBox = getValueDisplay(snapshotId, propValue, childMap, heap, this.context.textMeasurer);
                    propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
                    table.push([propTextBox, propValueBox]);
                }
                return table;
            }
        }
        return [[getValueDisplay(snapshotId, value, childMap, heap, this.context.textMeasurer)]];
    }
    
    deref(object: any) {
        if (isJsonrRef(object)) {
            object = this.context.dataCache.getObject(object.id);
        }
        return object;
    }
    
}

class HeapObjectRenderer implements ZoomRenderable {
    constructor(
        public entryIdx: number,
        public value: HeapRef, 
        public textMeasurer: TextMeasurer, 
        public heap: any) {
    }
    
    id(): string {
        return `heapObject[${this.entryIdx},${this.value.id}]`;
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
                    const itemBox = getValueDisplay(this.entryIdx, item, childMap, this.heap, this.textMeasurer);
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
                    const propValueBox = getValueDisplay(this.entryIdx, propValue, childMap, this.heap, this.textMeasurer);
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

function isHeapRef(thing): thing is HeapRef {
    return thing && typeof thing === "object" && typeof thing.id === "number";
}

function isJsonrRef(thing): boolean {
    return thing instanceof Ref;
}

function hasHeapValueChanged(id: number, heapOne: any, heapTwo) {
    if (heapOne[id] !== heapTwo[id]) {
        return true;
    } else {
        const thingOne = heapOne[id];
        const thingTwo = heapTwo[id];
        if (Array.isArray(thingOne)) {
            for (let i = 0; i < thingOne.length; i++) {
                if (thingOne[i] !== thingTwo[i]) {
                    return true;
                } else if (isHeapRef(thingOne[i])) {
                    if (hasHeapValueChanged(thingOne[i].id, heapOne, heapTwo)) {
                        return true;
                    }
                }
            }
            return false;
        } else if (typeof thingOne === "object") {
            for (let prop in thingOne) {
                const valueOne = thingOne[prop];
                const valueTwo = thingTwo[prop];
                if (valueOne !== valueTwo) {
                    return true;
                } else if (isHeapRef(valueOne)) {
                    if (hasHeapValueChanged(valueOne.id, heapOne, heapTwo)) {
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
    snapshotId: number,
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
        
        childMap.set(textBox, new HeapObjectRenderer(snapshotId, value, textMeasurer, heap));
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