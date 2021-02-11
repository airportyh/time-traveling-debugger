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
    const objectMap = db.cache.objectMap;
    const funCallMap = db.cache.funCallMap;
    const textPane = ScrollableTextPane(db, box);
    
    function updateDisplay() {
        const lines = [];
        let stack = funCallMap.get(db.snapshot.fun_call_id);
        let heap = db.snapshot.heapMap;
        let i = 1;
        while (true) {
            if (!stack) break;
            lines.push($s(stack.fun_name + "()", { display: 'underscore' }));
            renderLocals(stack.locals, heap, lines);
            renderClosureVariables(stack, heap, lines);
            renderGlobals(stack.globals, heap, lines);
            
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack.parent_id && funCallMap.get(stack.parent_id);
            i += 2;
        }
        
        textPane.updateAllLines(lines);
    }
    
    function resolve(value, heap) {
        if (isHeapRef(value)) {
            return objectMap.get(heap[value.id]);
        } else {
            return value;
        }
    }
    
    function renderLocals(locals, heap, lines) {
        const variables = objectMap.get(heap[locals]);
        variables.forEach((value, key) => {
            const prefix = $s(key, {foreground: 'green'}).concat(" = ");
            const renderedValue = renderValue(prefix, $s("  "), value, heap, new Set());
            lines.push(...renderedValue);
        });
    }
    
    function renderClosureVariables(stack, heap, lines) {
        if (stack.closure_cellvars) {
            const cellvars = jsonLike.parse(stack.closure_cellvars);
            const cellvarsEntries = cellvars.entries();
            for (let [key, value] of cellvarsEntries) {
                value = resolve(value, heap).get("ob_ref") || null;
                const prefix = $s(key, {foreground: 'yellow'}).concat(" = ");
                const renderedValue = renderValue(prefix, $s("  "), value, heap, new Set());
                lines.push(...renderedValue);
            }
        }
        
        if (stack.closure_freevars) {
            const freevars = jsonLike.parse(stack.closure_freevars);
            const freevarsEntries = freevars.entries();
            for (let [key, value] of freevarsEntries) {
                value = resolve(value, heap).get("ob_ref") || null;
                const prefix = $s(key, {foreground: 'yellow'}).concat(" = ");
                const renderedValue = renderValue(prefix, $s("  "), value, heap, new Set());
                lines.push(...renderedValue);
            }
        }
    }
    
    function renderGlobals(globals, heap, lines) {
        globals = objectMap.get(heap[globals]);
        if (!globals) {
            return;
        }
        let entries = Array.from(globals.entries());
        entries = entries.filter(([key, value]) => !resolve(key, heap).startsWith("__"));
        entries.sort((one, other) => {
            let oneKey = resolve(one[0], heap);
            let otherKey = resolve(other[0], heap);
            if (oneKey > otherKey) {
                return 1;
            } else if (oneKey === otherKey) {
                return 0;
            } else {
                return -1;
            }
        });
        for (let [key, value] of entries) {
            if (isHeapRef(key)) {
                key = objectMap.get(heap[key.id]);
            }
            const prefix = $s(key, {foreground: 'cyan'}).concat(" = ");
            log.write(`rendering global ${prefix} ${inspect(value)}\n`);
            const renderedValue = renderValue(prefix, $s("  "), value, heap, new Set());
            lines.push(...renderedValue);
        }
    }
    
    function renderValue(prefix, indent, value, heap, visited) {
        //log.write(`renderValue(${prefix}, ${inspect(value)}, ${inspect(heap)})\n`);
        const localVisited = new Set(visited);
        const oneLine = renderValueOneLine(value, heap, localVisited);
        if (prefix.length + oneLine.length < box.width) {
            for (let id of localVisited) {
                visited.add(id);
            }
            return [$s(indent).concat(prefix).concat(oneLine)];
        } else {
            return renderValueMultiLine(prefix, indent, value, heap, visited);
        }
    }
    
    function renderValueOneLine(value, heap, visited) {
        if (!isHeapRef(value)) {
            return JSON.stringify(value);
        }
        
        const ref = value;
        const refId = ref.id;
        if (!(refId in heap)) {
            return "{}";
        }
        const oid = heap[refId];
        let object = objectMap.get(heap[refId]);
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
            let outputs = object.map((item) => renderValueOneLine(item, heap, visited));
            let output = "[" + outputs.join(", ") + "]";
            if (object.__tag__) {
                output = `<${object.__tag__}>${output}`;
            }
            return output;
        } else if (object instanceof Map){
            // map
            let outputs = [];
            object.forEach((value, key) => {
                const keyDisplay = renderValueOneLine(key, heap, visited);
                const valueDisplay = renderValueOneLine(value, heap, visited);
                outputs.push(keyDisplay + ": " + valueDisplay);
            });
            let output = "{" + outputs.join(", ") + "}";
            if (object.__tag__) {
                output = `<${object.__tag__}>${output}`;
            }
            return output;
        } else {
            throw new Error("Unsupported type: " + inspect(object));
        }
    }
    
    function renderValueMultiLine(prefix, indent, value, heap, visited) {
        log.write(`RenderValueMultiline(${inspect(prefix)}, ${inspect(indent)}, ${inspect(value)})\n`);
        if (!isHeapRef(value)) {
            return [$s(indent).concat(prefix).concat(JSON.stringify(value))];
        }
        const ref = value;
        const refId = ref.id;
        if (!(refId in heap)) {
            return "{}";
        }
        let object = objectMap.get(heap[refId]);
        
        if (visited.has(refId) && (typeof object !== "string")) {
            return "*" + refId;
        }
        visited.add(refId);
        let lines = [];
        if (typeof object === "string") {
            lines.push($s(indent).concat(prefix).concat(JSON.stringify(object)));
        } else if (Array.isArray(object)) {
            let begin = "[";
            if (object.__tag__) {
                begin = `<${object.__tag__}>[`;
            }
            lines.push($s(indent).concat(prefix).concat(begin));
            for (let i = 0; i < object.length; i++) {
                let item = object[i];
                lines.push(...renderValue($s(""), $s(indent).concat("  "), item, heap, visited));
                if (i !== object.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push($s(indent).concat("]"));
        } else if (object instanceof Map) {
            let begin = "{";
            if (object.__tag__) {
                begin = `<${object.__tag__}>{`;
            }
            // log.write(`Rendering map: ${inspect(object)}\n`);
            lines.push($s(indent).concat(prefix).concat(begin));
            const keys = Array.from(object.keys());
            // log.write(`map keys: ${keys}\n`);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                const keyDisplay = renderValue($s(""), "", key, heap, visited);
                //log.write(`keyDisplay: ${inspect(keyDisplay)}\n`);
                lines.push(...keyDisplay.slice(0, keyDisplay.length - 1));
                const keyDisplayLastLine = keyDisplay[keyDisplay.length - 1];
                let value = object.get(key);
                const valueDisplay = renderValue(keyDisplayLastLine + ": ", indent + "  ", value, heap, visited);
                // log.write(`valueDisplay: ${inspect(valueDisplay)}\n`);
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