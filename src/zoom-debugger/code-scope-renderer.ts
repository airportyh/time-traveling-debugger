import { ZoomRenderable, BoundingBox } from "./zui";
import { HistoryEntry } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { traverse } from "../traverser";

const CODE_LINE_HEIGHT = 1.5;
const CODE_FONT_FAMILY = "Monaco";
const LINE_NUMBER_COLOR = "#666666";
const CODE_COLOR = "black";
const VARIABLE_DISPLAY_COLOR = "#f0b155";
const HEAP_REF_COLOR = "#119af5";

type SubEntryGroup = {
    callExpr: any
    entries: HistoryEntry[]
};

type HeapRef = { id: number };

function isHeapRef(thing): thing is HeapRef {
    return thing && typeof thing === "object" && typeof thing.id === "number";
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
    entryIdx: number,
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
        
        childMap.set(textBox, new HeapObjectRenderer(entryIdx, value, textMeasurer, heap));
        return textBox;
    }
    return {
        type: "text",
        text: JSON.stringify(value),
        color: VARIABLE_DISPLAY_COLOR
    };
}

function getValueDisplayLength(value: any): number {
    if (isHeapRef(value)) {
        return String("*" + value.id).length;
    }
    return JSON.stringify(value).length;
}

export class CodeScopeRenderer implements ZoomRenderable {
    entryIdx: number;
    entries: HistoryEntry[];
    ast: any;
    callExpr: any;
    callExprCode: string;
    code: string;
    textMeasurer: TextMeasurer;
    
    constructor(entries: HistoryEntry[], callExpr: any, callExprCode: string, ast: any, code: string, textMeasurer: TextMeasurer) {
        this.entries = entries;
        this.callExpr = callExpr;
        this.callExprCode = callExprCode;
        this.ast = ast;
        this.code = code;
        this.textMeasurer = textMeasurer;
    }
    
    id(): string {
        return `scope[${this.entries[0].idx},${this.callExpr.start && this.callExpr.start.offset},${this.callExpr.end && this.callExpr.end.offset}]`;
    }
    
    render(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        viewport: BoundingBox,
        mouseX: number,
        mouseY: number
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
        const firstEntry = this.entries[0];
        const stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        const funName = stackFrame.funName;
        const funNode = findFunction(this.ast, funName);
        const userDefinedFunctions = findNodesOfType(this.ast, "function_definition");
        const userDefinedFunctionNames = userDefinedFunctions.map(fun => fun.name.value);

        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);

        const { currentEntries, childEntries } = groupHistoryEntries(funNode, this.entries, userDefinedFunctionNames);
        
        //console.log(funName, "group entries", currentEntries, childEntries, this.entries);

        if (myAreaRatio < 0.4) {
            // not rendering children
            const textBox: TextBox = {
                type: "text",
                text: this.callExprCode
            };
            fitBox(textBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, this.textMeasurer, CODE_LINE_HEIGHT, ctx);
        } else {
            const { codeBox, childMap } = this.getCodeBox(
                this.code, currentEntries, childEntries, 
                userDefinedFunctionNames, this.ast
            );
            
            const bboxMap = fitBox(
                codeBox, bbox, viewport, CODE_FONT_FAMILY, 
                "normal", true, this.textMeasurer, CODE_LINE_HEIGHT, ctx);
    
            // generate map from bounding box to child zoom-renderable
            let childRenderables: Map<BoundingBox, ZoomRenderable> = new Map();
            for (let [box, renderable] of childMap) {
                const childBBox = bboxMap.get(box);
                childRenderables.set(childBBox, renderable);
            }
            return childRenderables;
        }
        return new Map();
    }

    getCodeBox(
        code: string, 
        currentEntries: HistoryEntry[], 
        childEntries: Map<HistoryEntry, SubEntryGroup[]>, 
        userDefinedFunctionNames: string[],
        ast: any
        ): { codeBox: Box, childMap: Map<Box, ZoomRenderable> } {
        // rendering children
        //console.log(indent + "myAreaRatio >= 0.5");
        const codeLines = code.split("\n");
        const firstEntry = currentEntries[0];
        const stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        const funName = stackFrame.funName;
        const funNode = findFunction(ast, funName);
        const lineNumberWidth = 3;
        const childMap: Map<Box, ZoomRenderable> = new Map();
        
        const codeBox: Box = {
            type: "container",
            direction: "vertical",
            children: []
        };
        // layout the function signature
        codeBox.children.push(this.layoutFunctionSignature(funNode, stackFrame, codeLines, lineNumberWidth, childMap, firstEntry.heap));
        
        // Go through current entries and layout the code line by line
        for (let i = 0; i < currentEntries.length; i++) {
            const entry = currentEntries[i];
            const nextEntry = currentEntries[i + 1];
            if (nextEntry && entry.line === nextEntry.line) {
                continue;
            }
            const line = codeLines[entry.line - 1];
            const lineNumberBox: TextBox = {
                type: "text",
                text: String(entry.line).padEnd(lineNumberWidth) + "  ",
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
            this.renderUpdatedHeapObjects(entry, nextEntry, childMap, valueDisplayStrings);
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
    
    renderLine(
        line: string, 
        entry: HistoryEntry, 
        lineBox: ContainerBox, 
        childEntries: Map<HistoryEntry, SubEntryGroup[]>,
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
            childMap.set(
                callExprTextBox, 
                new CodeScopeRenderer(
                    subEntryGroup.entries,
                    callExprNode,
                    callExprCode,
                    this.ast,
                    this.code,
                    this.textMeasurer
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
    
    renderVariableAssignmentValues(entry: HistoryEntry, funNode: any, nextEntry: HistoryEntry, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        // Display variable values for assignments
        const assignmentNode = findNodesOfTypeOnLine(funNode, "var_assignment", entry.line)[0];
        if (assignmentNode) {
            const varName = assignmentNode.var_name.value;
            if (nextEntry) {
                const nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
                let varValue = nextStackFrame.variables[varName];
                const varValueDisplay = this.getVarValueDisplay(entry.idx, varValue, childMap, nextEntry.heap);
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
        
    }
    
    renderUpdatedHeapObjects(entry: HistoryEntry, nextEntry: HistoryEntry, childMap: Map<Box, ZoomRenderable>, valueDisplayStrings: Box[][]) {
        if (nextEntry) {
            const nextFrame = nextEntry.stack[nextEntry.stack.length - 1];
            const currentFrame = entry.stack[entry.stack.length - 1];
            for (let varName in currentFrame.variables) {
                const value = currentFrame.variables[varName];
                if (isHeapRef(value)) {
                    const nextValue = nextFrame.variables[varName];
                    const headValueChanged = hasHeapValueChanged(value.id, entry.heap, nextEntry.heap);
                    //console.log("line", entry.line, "value", value, "prevValue", nextValue, "entry.heap[value.id]", value && entry.heap[value.id],
                    //    "prevEntry.heap[prevValue.id]", nextValue && nextEntry.heap[nextValue.id], headValueChanged);
                    if (!nextValue || 
                        (isHeapRef(value) && (
                        (value.id !== nextValue.id) || headValueChanged))) {
                        //console.log(varName, "heap value changed on line", entry.line);
                        const varValueDisplay = this.getVarValueDisplay(entry.idx, value, childMap, nextEntry.heap);
                        //console.log("adding valueDisplayStrings", valueDisplayStrings);
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
        entry: HistoryEntry, 
        nextEntry: HistoryEntry, 
        childMap: Map<Box, ZoomRenderable>,
        valueDisplayStrings: Box[][]
    ) {
        // Display variable values for return statements
        const returnStatement = findNodesOfTypeOnLine(funNode, "return_statement", entry.line)[0];
        if (returnStatement) {
            const nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
            const varValue = nextStackFrame.variables["<ret val>"];
            const valueDisplay = this.getVarValueDisplay(entry.idx, varValue, childMap, nextEntry.heap);
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

    layoutFunctionSignature(funNode: any, stackFrame: any, codeLines: string[], lineNumberWidth: number, childMap: Map<Box, ZoomRenderable>, heap: any) {
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
                    text: codeLines[funNode.start.line - 1],
                    color: CODE_COLOR
                }
            ]
        };
        for (let param of funNode.parameters) {
            const paramName = param.value;
            let value = stackFrame.variables[paramName];
            const rows = this.getVarValueDisplay(this.entries[0].idx, value, childMap, heap);
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
    
    getVarValueDisplay(entryIdx: number, value: any, childMap: Map<Box, ZoomRenderable>, heap: any): Box[][] {
        if (isHeapRef(value)) {
            const object = heap[value.id];
            if (Array.isArray(object)) {
                const row: Box[] = [];
                for (let i = 0; i < object.length; i++) {
                    const item = object[i];
                    const itemBox = getValueDisplay(entryIdx, item, childMap, heap, this.textMeasurer);
                    itemBox.text = " " + itemBox.text + " ";
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
                    const propValueBox = getValueDisplay(entryIdx, propValue, childMap, heap, this.textMeasurer);
                    propValueBox.border = { color: VARIABLE_DISPLAY_COLOR };
                    propValueBox.text = propValueBox.text.padEnd(rightColumnWidth, " ");
                    table.push([propTextBox, propValueBox]);
                }
                return table;
            }
        }
        return [[getValueDisplay(entryIdx, value, childMap, heap, this.textMeasurer)]];
    }
    /*
    getVarValueDisplay_(varValue: any, childMap: Map<Box, ZoomRenderable>, heap: any): TextBox[][] {
        if (isHeapRef(varValue)) {
            varValue = heap[varValue.id];
        }
        if (typeof varValue === "string") {
            return [[{
                type: "text",
                text: '"' + varValue + '"',
                color: VARIABLE_DISPLAY_COLOR
            }]];
        } else if (Array.isArray(varValue)) {
            const array = varValue;
            return [array.map(item => {
                const display = isHeapRef(item) ? String(item.id) : " " + JSON.stringify(item) + " ";
                const textBox: TextBox = {
                    type: "text",
                    text: " " + display + " ",
                    color: VARIABLE_DISPLAY_COLOR,
                    border: {
                        color: VARIABLE_DISPLAY_COLOR
                    }
                };
                
                if (isHeapRef(item)) {
                    childMap.set(textBox, {
                        render: (ctx, bbox, viewport): Map<BoundingBox, ZoomRenderable> => {
                            const myArea = bbox.width * bbox.height;
                            const myAreaRatio = myArea / (viewport.width * viewport.height);
                            if (myAreaRatio > 0.001) {
                                const value = heap[item.id];
                                ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
                                const childMap = new Map();
                                const rows = this.getVarValueDisplay(value, childMap, heap);
                                const outerBox: Box = {
                                    type: "container",
                                    direction: "vertical",
                                    children: rows.map((cells) => ({
                                        type: "container",
                                        direction: "horizontal",
                                        children: cells
                                    }))
                                } as Box;
                                const bboxMap = fitBox(outerBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, this.textMeasurer, CODE_LINE_HEIGHT, ctx, VARIABLE_DISPLAY_COLOR);
                                const childBboxMap = new Map();
                                for (let [box, renderable] of bboxMap.entries()) {
                                    childBboxMap.set(bboxMap.get(box), renderable);
                                }
                                //return childBboxMap;
                            }
                            return new Map();
                        }
                    })
                }
                return textBox;
            })];
        } else if (typeof varValue === "object") {
            const dict = varValue;
            const boxes = [];
            for (let key in dict) {
                const value = dict[key];
                boxes.push([
                    {
                        type: "text",
                        text: " " + key + " ",
                        color: VARIABLE_DISPLAY_COLOR,
                        border: {
                            color: VARIABLE_DISPLAY_COLOR
                        }
                    },
                    {
                        type: "text",
                        text: " " + JSON.stringify(value) + " ",
                        color: VARIABLE_DISPLAY_COLOR,
                        border: {
                            color: VARIABLE_DISPLAY_COLOR
                        }
                    }
                ]);
            }
            return boxes;
        } else {
            return [[
                {
                    type: "text",
                    text: String(varValue),
                    color: VARIABLE_DISPLAY_COLOR
                }
            ]]
        }
    }
    */

    toString() {
        return this.callExprCode;
    }
}

function groupHistoryEntries(funNode: any, entries: HistoryEntry[], userDefinedFunctionNames: string[]) {
    const funName = funNode.name.value;
    if (funName === "playGame") {
        //debugger;
    }
    const currentStackHeight = entries[0].stack.length;
    const currentLevelEntries: HistoryEntry[] = [];
    let currentParentEntry: HistoryEntry = entries[0];
    let currentChildLevelEntries: HistoryEntry[] = [];
    let callExprs: any[] = null;
    let subEntryGroups: SubEntryGroup[] = null;
    let callExprsIdx: number = 0;
    const entryMap: Map<HistoryEntry, SubEntryGroup[]> = new Map();
    let state = "open";
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        entry["idx"] = i;
        if (state === "open") {
            if (entry.stack.length > currentStackHeight) {
                state = "collecting";
                callExprs = findNodesOfTypeOnLine(funNode, "call_expression", currentParentEntry.line)
                    .filter(expr => userDefinedFunctionNames.includes(expr.fun_name.value));
                callExprsIdx = 0;
                subEntryGroups = [];
                currentChildLevelEntries = [entry];
            } else {
                currentLevelEntries.push(entry);
                currentParentEntry = entry;
            }
        } else if (state === "collecting") {
            if (entry.stack.length > currentStackHeight) {
                currentChildLevelEntries.push(entry);
            } else {
                // we are back
                const callExpr = callExprs[callExprsIdx];
                const newGroup = {
                    callExpr,
                    entries: currentChildLevelEntries
                };
                subEntryGroups.push(newGroup);
                
                callExprsIdx++;
                if (callExprsIdx >= callExprs.length) {
                    state = "open";
                    
                    entryMap.set(currentParentEntry, subEntryGroups);
                    subEntryGroups = [];
                    
                    // if entry is the same line as currentParentEntry that means
                    // there is no need to add the entry to the currentLevelEntries
                    // again because the previous instance is enough, it's also
                    // important to leave the last instance because that's the instance
                    // we are using as the key to entryMap
                    
                    if (entry.line !== currentParentEntry.line) {
                        currentLevelEntries.push(entry);
                    }
                    currentParentEntry = entry;
                    
                } else {
                    // TODO test semi open with the fib example
                    // which has 2 call exprs on the same line
                    state = "semiopen";
                }
            }
        } else if (state === "semiopen") {
            if (entry.stack.length > currentStackHeight) {
                state = "collecting";
                currentChildLevelEntries = [entry];
            } else {
                throw new Error("Unexpected state");
            }
        }
    }
    
    return {
        currentEntries: currentLevelEntries,
        childEntries: entryMap
    };
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
    
    render(
        ctx: CanvasRenderingContext2D,
        bbox: BoundingBox,
        viewport: BoundingBox,
        mouseX: number,
        mouseY: number
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

function findLine(ast, lineNo) {
    let found;
    traverse(ast, (node) => {
        if (node.start && node.start.line === lineNo) {
            found = node;
            return false;
        } else {
            return undefined;
        }
    });
    return found;
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

function findNodesOfTypeOnLine(node, type, lineNo) {
    let defs = [];
    traverse(node, (childNode) => {
        if (childNode.type === type && childNode.start.line === lineNo) {
            defs.push(childNode);
        }
    });
    return defs;
}