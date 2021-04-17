import {
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import { isRef, isHeapRef } from "./language.mjs"
import jsonLike from "../json-like/json-like.js";
import $s from "styled_string";
import util from "util";

export function RichStackPane(db, box) {
    const self = {
        updateDisplay,
        get textPane() { return textPane }
    };
    
    const inspect = util.inspect;
    const log = db.log;
    const cache = db.cache;
    const textPane = ScrollableTextPane(db, box);
    const expandCollapseStates = new Map();
    
    function updateDisplay() {
        const lines = [];
        let stack = cache.getFunCall(db.snapshot.fun_call_id);
        let heapVersion = db.snapshot.heap;
        let i = 1;
        while (true) {
            if (!stack) break;
            const fun = cache.getFun(stack.fun_id);
            const funName = fun && fun.name || "<unknown>";
            lines.push($s(funName + "()", { display: 'underscore' }));
            renderLocals(stack.locals, heapVersion, lines);
            renderClosureVariables(stack, heapVersion, lines);
            renderGlobals(stack.globals, heapVersion, lines);
            
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack.parent_id && cache.getFunCall(stack.parent_id);
            i += 2;
        }
        
        textPane.updateAllLines(lines);
    }
    
    function resolve(value, heapVersion, heap) {
        if (isHeapRef(value)) {
            return cache.getHeapObject(heapVersion, value.id);
        } else {
            return value;
        }
    }
    
    function renderLocals(locals, heapVersion, lines) {
        const variables = cache.getHeapObject(heapVersion, locals);
        variables.forEach((value, key) => {
            const prefix = $s(key, {foreground: 'green'}).concat(" = ");
            const renderedValue = renderValue(prefix, $s("  "), value, heapVersion, new Set(), [key]);
            lines.push(...renderedValue);
        });
    }
    
    function renderClosureVariables(stack, heapVersion, lines) {
        if (stack.closure_cellvars) {
            const cellvars = jsonLike.parse(stack.closure_cellvars);
            const cellvarsEntries = cellvars.entries();
            for (let [key, value] of cellvarsEntries) {
                value = resolve(value, heapVersion).get("ob_ref") || null;
                const prefix = $s(key, {foreground: 'yellow'}).concat(" = ");
                const renderedValue = renderValue(prefix, $s("  "), value, heapVersion, new Set(), [key]);
                lines.push(...renderedValue);
            }
        }
        
        if (stack.closure_freevars) {
            const freevars = jsonLike.parse(stack.closure_freevars);
            const freevarsEntries = freevars.entries();
            for (let [key, value] of freevarsEntries) {
                value = resolve(value, heapVersion).get("ob_ref") || null;
                const prefix = $s(key, {foreground: 'yellow'}).concat(" = ");
                const renderedValue = renderValue(prefix, $s("  "), value, heapVersion, new Set(), [key]);
                lines.push(...renderedValue);
            }
        }
    }
    
    function renderGlobals(globals, heapVersion, lines) {
        globals = cache.getHeapObject(heapVersion, globals);
        if (!globals) {
            return;
        }
        let entries = Array.from(globals.entries());
        entries = entries.filter(([key, value]) => !resolve(key, heapVersion).startsWith("__"));
        entries.sort((one, other) => {
            let oneKey = resolve(one[0], heapVersion);
            let otherKey = resolve(other[0], heapVersion);
            if (oneKey > otherKey) {
                return 1;
            } else if (oneKey === otherKey) {
                return 0;
            } else {
                return -1;
            }
        });
        for (let [key, value] of entries) {
            key = resolve(key, heapVersion);
            const prefix = $s(key, {foreground: 'cyan'}).concat(" = ");
            // log.write(`rendering global ${inspect(key)} ${inspect(value)}\n`);
            const renderedValue = renderValue(prefix, $s("  "), value, heapVersion, new Set(), [key]);
            lines.push(...renderedValue);
        }
    }
    
    function renderValue(prefix, indent, value, heapVersion, visited, path) {
        // log.write(`renderValue(${prefix}, ${inspect(value)})\n`);
        const localVisited = new Set(visited);
        const oneLine = renderValueOneLine(value, heapVersion, localVisited);
        if (indent.length + prefix.length + oneLine.length < box.width) {
            for (let id of localVisited) {
                visited.add(id);
            }
            return [$s(indent).concat(prefix).concat(oneLine)];
        } else {
            return renderValueMultiLine(prefix, indent, value, heapVersion, visited, path);
        }
    }
    
    function stringify(value) {
        if (value === null || value === undefined) {
            return "None";
        } else if (value === true) {
            return "True";
        } else if (value === false) {
            return "False";
        } else {
            return JSON.stringify(value);
        }
    }
    
    function renderValueOneLine(value, heapVersion, visited) {
        let object;
        
        if (isHeapRef(value)) {
            const ref = value;
            const refId = ref.id;
            const oid = cache.heapLookup(heapVersion, refId);
            if (!oid) {
                return `^${refId}`;
            }
            object = cache.getObject(oid);
            if (object === undefined) {
                return `*!${oid}`;
            }
            // log.write(`heap: ${inspect(heap)}`);
            if (visited.has(refId) && (typeof object !== "string")) {
                return "*" + refId;
            }
            visited.add(refId);
        } else {
            object = value;
        }
        
        if (typeof object === "string" || typeof object === "number" || typeof object === "boolean" || object === null || object === undefined) {
            return stringify(object);
        } else if (Array.isArray(object)) {
            let outputs = object.map((item) => renderValueOneLine(item, heapVersion, visited));
            let tag = object.__tag__;
            let output;
            if (tag === "tuple") {
                output = "(" + outputs.join(", ") + ")";
            } else if (tag === "set") {
                output = "{" + outputs.join(", ") + "}";
            } else {
                output = "[" + outputs.join(", ") + "]";
                if (tag) {
                    output = `<${object.__tag__}>${output}`;
                }
            }
            return output;
        } else if (object instanceof Map){
            let keys = Array.from(object.keys());
            let output;
            let tag = object.__tag__;
            
            if (keys.length === 1 && keys[0] === "__dict__") {
                const dict = object.get("__dict__");
                return renderValueOneLine(dict, heapVersion, visited);
            }
            
            if (tag === "cell") {
                const obRef = object.get("ob_ref");
                return renderValueOneLine(obRef, heapVersion, visited);
            }
            
            let fun_id;
            
            if (tag === "function") {
                fun_id = object.get("fun_id");
                object = object.get("closure_freevars") || new Map();
            }
            
            let outputs = [];
            object.forEach((value, key) => {
                if (isHeapRef(key)) {
                    const realKey = cache.getHeapObject(heapVersion, key.id);
                    if (typeof realKey === "string") {
                        if (realKey.startsWith("__")) {
                            return;
                        }
                    }
                }
                const keyDisplay = renderValueOneLine(key, heapVersion, visited);
                const valueDisplay = renderValueOneLine(value, heapVersion, visited);
                // log.write(`value: ${inspect(value)}, valueDisplay: ${inspect(valueDisplay)}\n`);
                outputs.push(keyDisplay + ": " + valueDisplay);
            });
            output = "{" + outputs.join(", ") + "}";
            
            if (tag === "type") {
                tag = "class";
            }
            if (tag) {
                if (output === "{}") {
                    output = "";
                }
                if (tag === "function") {
                    // get function name
                    const fun = cache.getFun(fun_id);
                    if (fun) {
                        output = `<function ${fun.name}>${output}`;
                    } else {
                        output = `<function>${output}`;
                    }
                } else {
                    output = `<${tag}>${output}`;
                }
            }
            return output;
        } else {
            throw new Error("Unsupported type: " + inspect(object));
        }
    }
    
    function renderValueMultiLine(prefix, indent, value, heapVersion, visited, path) {
        // log.write(`RenderValueMultiline(${inspect(path)}, ${inspect(value)})\n`);
        let object;
        let childPath;
        if (isHeapRef(value)) {
            const ref = value;
            const refId = ref.id;
            childPath = [...path, refId];
            const oid = cache.heapLookup(heapVersion, refId);
            if (!oid) {
                return `^${refId}`;
            }
            object = cache.getObject(oid);
            
            if (visited.has(refId) && (typeof object !== "string")) {
                return "*" + refId;
            }
            visited.add(refId);
        } else {
            object = value;
            childPath = path;
        }
        let lines = [];
        if (typeof object === "string" || typeof object === "number" || 
            typeof object === "boolean" || object === null || object === undefined) {
            lines.push($s(indent).concat(prefix).concat(stringify(object)));
        } else if (Array.isArray(object)) {
            let begin;
            let end;
            let tag = object.__tag__;
            if (tag === "tuple") {
                begin = $s("( ");
                end = ")";
            } else if (tag === "set") {
                begin = $s("{ ");
                end = "}";
            } else {
                begin = $s("[ ");
                end = "]";
                if (tag) {
                    begin = $s(`<${tag}>`).concat(begin);
                }
            }
            lines.push($s(indent).concat(prefix).concat(begin));
            for (let i = 0; i < object.length; i++) {
                let item = object[i];
                lines.push(...
                    renderValue(
                        $s(""), $s(indent).concat("  "), 
                        item, heapVersion, visited, childPath)
                    );
                if (i !== object.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push($s(indent).concat(end));
        } else if (object instanceof Map) {
            let tag = object.__tag__;
            if (tag === "type") {
                tag = "class";
            }
            let fun_id;
            if (tag === "function") {
                fun_id = object.get("fun_id");
                object = object.get("closure_freevars") || new Map();
            } else if (tag === "cell") {
                object = object.get("ob_ref");
                lines.push(...renderValue($s(prefix), indent, object, heapVersion, visited, childPath));
                return lines;
            }
            
            let keys = Array.from(object.keys());
            if (keys.length === 1 && keys[0] === "__dict__") {
                const dict = object.get("__dict__");
                const display = renderValue($s(prefix).concat(`<${tag}>`), indent, dict, heapVersion, visited, childPath);
                lines.push(...display);
                return lines;
            }
            let begin = "{";
            if (tag === "function") {
                const fun = cache.getFun(fun_id);
                begin = `<${tag} ${fun.name}>${begin}`;
            } else if (tag) {
                begin = `<${tag}>${begin}`;
            }
            lines.push($s(indent).concat(prefix).concat(begin));
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                if (isHeapRef(key)) {
                    const realKey = cache.getHeapObject(heapVersion, key.id);
                    if (typeof realKey === "string") {
                        if (realKey.startsWith("__")) {
                            continue;
                        }
                    }
                }
                const keyDisplay = renderValue($s(""), "", key, heapVersion, visited, childPath);
                lines.push(...keyDisplay.slice(0, keyDisplay.length - 1));
                const keyDisplayLastLine = keyDisplay[keyDisplay.length - 1];
                let value = object.get(key);
                const valueDisplay = renderValue(
                    keyDisplayLastLine + ": ", indent + "  ", value, heapVersion, visited, childPath);
                lines.push(...valueDisplay);
                if (i !== keys.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push(indent + "}");
        } else {
            throw new Error("Unsupported type: " + inspect(object));
        }
        
        return lines;
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}