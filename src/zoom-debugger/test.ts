import * as jsonr from "@airportyh/jsonr";
import { parse } from "../parser";
import { HistoryEntry } from "./play-lang";
import { initZoomDebugger } from "./index";
import { traverse } from "../traverser";

main().catch(err => console.log(err.stack));

async function main() {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.left = "0%";
    element.style.width = "100%";
    element.style.height = "100%";
    document.body.appendChild(element);
    
    const code = await fetchText("ex/tic-tac-toe.play");
    const ast = parse(code);
    const historyText = await fetchText("ex/tic-tac-toe.history");
    const history: HistoryEntry[] = jsonr.parse(historyText);
    
    initZoomDebugger(element, code, history);
}

type SubEntryGroup = {
    callExpr: any
    entries: HistoryEntry[]
};

function findNodesOfTypeOnLine(node, type, lineNo) {
    let defs = [];
    traverse(node, (childNode) => {
        if (childNode.type === type && childNode.start.line === lineNo) {
            defs.push(childNode);
        }
    });
    return defs;
}

function groupHistoryEntries2(funNode: any, entries: HistoryEntry[], userDefinedFunctionNames: string[]) {
    const currentStackHeight = entries[0].stack.length;
    const currentLevelEntries: HistoryEntry[] = [];
    let currentParentEntry: HistoryEntry = entries[0];
    let currentChildLevelEntries: HistoryEntry[] = [];
    let callExprs: any[] = null;
    let callExprsIdx: number = 0;
    const entryMap: Map<HistoryEntry, SubEntryGroup> = new Map();
    let state = "open";
    for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        if (state === "open") {
            if (entry.stack.length > currentStackHeight) {
                state = "collecting";
                callExprs = findNodesOfTypeOnLine(funNode, "call_expression", entry.line)
                    .filter(expr => userDefinedFunctionNames.includes(expr.fun_name.value));
                callExprsIdx = 0;
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
                if (callExprsIdx < callExprs.length) {
                    const callExpr = callExprs[callExprsIdx];
                    entryMap.set(currentParentEntry, {
                        callExpr,
                        entries: currentChildLevelEntries
                    });
                    currentParentEntry = null;
                    callExprsIdx++;
                    state = "semiopen";
                } else {
                    state = "open";
                    currentParentEntry = null;
                    callExprs = null;
                    callExprsIdx = 0;
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
}

async function fetchText(filename) {
    const request = await fetch(filename);
    return request.text();
}