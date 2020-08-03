import { ZoomRenderable, BoundingBox } from "./zui";
import { HistoryEntry } from "./play-lang";
import { TextMeasurer, TextBox, fitBox, Box, ContainerBox } from "./fit-box";
import { traverse } from "../traverser";

const CODE_LINE_HEIGHT = 1.5;
const CODE_FONT_FAMILY = "Monaco";
const LINE_NUMBER_COLOR = "#489dff";
const CODE_COLOR = "black";
const VARIABLE_DISPLAY_COLOR = "#f0b155";

type SubEntryGroup = {
    callExpr: any
    entries: HistoryEntry[]
};

function isHeapRef(thing) {
    return typeof thing === "object" && typeof thing.id === "number";
}

export class CodeScopeRenderer implements ZoomRenderable {
    entries: HistoryEntry[];
    ast: any;
    callExprCode: string;
    code: string;
    textMeasurer: TextMeasurer;
    
    constructor(entries: HistoryEntry[], callExprCode: string, ast: any, code: string, textMeasurer: TextMeasurer) {
        this.entries = entries;
        this.callExprCode = callExprCode;
        this.ast = ast;
        this.code = code;
        this.textMeasurer = textMeasurer;
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
        const firstEntry = this.entries[0];
        const stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        const funName = stackFrame.funName;
        const funNode = findFunction(this.ast, funName);
        const userDefinedFunctions = findNodesOfType(this.ast, "function_definition");
        const userDefinedFunctionNames = userDefinedFunctions.map(fun => fun.name.value);

        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);

        const { currentEntries, childEntries } = groupHistoryEntries2(funNode, this.entries, userDefinedFunctionNames);
        
        console.log("group entries", currentEntries, childEntries);

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
        
        console.log("Current entries for", funName, currentEntries);
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
            
            this.renderReturnValues(funNode, entry, nextEntry, valueDisplayStrings);
            
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
        childMap: any
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
    
    renderVariableAssignmentValues(entry: HistoryEntry, funNode: any, nextEntry: HistoryEntry, childMap: any, valueDisplayStrings: TextBox[][]) {
        // Display variable values for assignments
        const assignmentNode = findNodesOfTypeOnLine(funNode, "var_assignment", entry.line)[0];
        if (assignmentNode) {
            const varName = assignmentNode.var_name.value;
            if (nextEntry) {
                const nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
                let varValue = nextStackFrame.variables[varName];
                if (isHeapRef(varValue)) {
                    // heap reference
                    varValue = nextEntry.heap[varValue.id];
                }
                const varValueDisplay = this.getVarValueDisplay(varValue, childMap, nextEntry.heap);
                const prefix = `${varName} = `;
                const tboxes: TextBox[][] = varValueDisplay.map((boxes, idx) => {
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
    
    renderReturnValues(funNode: any, entry: HistoryEntry, nextEntry: HistoryEntry, valueDisplayStrings: TextBox[][]) {
        // Display variable values for return statements
        const returnStatement = findNodesOfTypeOnLine(funNode, "return_statement", entry.line)[0];
        if (returnStatement) {
            const nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
            const varValue = String(nextStackFrame.variables["<ret val>"]);
            valueDisplayStrings.push([
                {
                    type: "text",
                    text: `<ret val> = `,
                    color: VARIABLE_DISPLAY_COLOR
                },
                {
                    type: "text",
                    text: varValue,
                    color: VARIABLE_DISPLAY_COLOR
                }
            ]);
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
            if (isHeapRef(value)) {
                value = heap[value.id];
            }
            const rows = this.getVarValueDisplay(value, childMap, heap);
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

    getVarValueDisplay(varValue: any, childMap: Map<Box, ZoomRenderable>, heap: any): TextBox[][] {
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
                    text: display,
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

    toString() {
        return this.callExprCode;
    }
}


function groupHistoryEntries(funNode, entries: HistoryEntry[], userDefinedFunctionNames: string[]) {
    const currentStackHeight = entries[0].stack.length;
    const childEntries: Map<any, HistoryEntry[]> = new Map();
    const currentEntries = [];
    
    let currentLine: number = null;
    let callExprs: any[] = null;
    let currentCallExprIdx = null;
    for (let entry of entries) {
        if (entry.stack.length === currentStackHeight) {
            if (currentLine !== entry.line) {
                currentLine = entry.line;
                // initialize context for this line
                currentEntries.push(entry);
                // find call expressions on this line
                callExprs = findNodesOfTypeOnLine(funNode, "call_expression", entry.line)
                    .filter(expr => userDefinedFunctionNames.includes(expr.fun_name.value));
                currentCallExprIdx = 0;
            } else { // currentLine === entry.line
                currentCallExprIdx++;
            }
        } else {
            // nested scope execution
            const callExpr = callExprs[currentCallExprIdx];
            if (!childEntries.has(callExpr)) {
                childEntries.set(callExpr, []);
            }
            childEntries.get(callExpr).push(entry);
        }
    }
    
    return {
        currentEntries,
        childEntries
    };
}

function groupHistoryEntries2(funNode: any, entries: HistoryEntry[], userDefinedFunctionNames: string[]) {
    const funName = funNode.name.value;
    //debugger
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
                //entryMap.set(currentParentEntry, );
                
                callExprsIdx++;
                if (callExprsIdx >= callExprs.length) {
                    state = "open";
                    
                    entryMap.set(currentParentEntry, subEntryGroups);
                    subEntryGroups = [];
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