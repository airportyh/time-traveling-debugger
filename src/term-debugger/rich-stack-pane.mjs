import {
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import { isRef, isHeapRef } from "./language.mjs"
import StyledString from "styled_string";
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
        let stack = objectMap.get(db.snapshot.stack);
        let heap = objectMap.get(db.snapshot.heap);
        let i = 1;
        while (true) {
            if (!stack) break;
            const frame = objectMap.get(stack[0].id);
            const variables = objectMap.get(frame.get("variables").id);
            //log.write(`frame: ${frame}, funCall: ${frame.get("funCall")}\n`);
            const funCall = funCallMap.get(frame.get("funCall"));
            const parameters = objectMap.get(funCall.parameters);
            
            let parametersDisplay = [];
            for (let key in parameters) {
                let display;
                let value = parameters[key];
                if (isRef(value)) {
                    display = "*" + value.id;
                } else {
                    display = JSON.stringify(value);
                }
                parametersDisplay.push(key + "=" + display);
            }
            
            lines.push(StyledString(funCall.fun_name + "(" + parametersDisplay.join(", ") + ")", { display: 'underscore' }));
            variables.forEach((value, key) => {
                const displayValue = renderValue(key + " = ", "", value, heap, new Set());
                log.write(`value: ${JSON.stringify(displayValue)}\n`);
                lines.push(...displayValue);
            });
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack[1] && objectMap.get(stack[1].id);
            i += 2;
        }
        
        textPane.updateAllLines(lines);
    }
    
    function renderValue(prefix, indent, value, heap, visited) {
        //log.write(`renderValue(${prefix}, ${inspect(value)}, ${inspect(heap)})\n`);
        const localVisited = new Set(visited);
        const oneLine = renderValueOneLine(value, heap, localVisited);
        if (prefix.length + oneLine.length < box.width) {
            for (let id of localVisited) {
                visited.add(id);
            }
            return [indent + prefix + oneLine];
        } else {
            return renderValueMultiLine(prefix, indent, value, heap, visited);
        }
    }
    
    
    function renderValueOneLine(value, heap, visited) {
        if (!isHeapRef(value)) {
            return JSON.stringify(value);
        }
        
        const ref = value;
        const refId = ref.get("id");
        //log.write(`renderValueOneLine(${inspect(refId)}, ${inspect(ref)}, heap: ${inspect(heap)}\n`);
        if (visited.has(refId)) {
            return "*" + refId;
        }
        visited.add(refId);
        let object = heap.get(String(refId));
        if (object === undefined) {
            return "{}";
        }
        if (isRef(object)) {
            object = objectMap.get(object.id);
        }
        if (typeof object === "string") {
            return JSON.stringify(object);
        } else if (Array.isArray(object)) {
            let outputs = object.map((item) => renderValueOneLine(item, heap, visited));
            return "[" + outputs.join(", ") + "]";
        } else if (object instanceof Map){
            // map
            let outputs = [];
            object.forEach((value, key) => {
                const keyDisplay = renderValueOneLine(key, heap, visited);
                const valueDisplay = renderValueOneLine(value, heap, visited);
                outputs.push(keyDisplay + ": " + valueDisplay);
            });
            return "{" + outputs.join(", ") + "}";
        } else {
            throw new Error("Unsupported type: " + inspect(object));
        }
    }
    
    function renderValueMultiLine(prefix, indent, value, heap, visited) {
        if (!isHeapRef(value)) {
            return [indent + prefix + JSON.stringify(value)];
        }
        
        const ref = value;
        const refId = ref.get("id");
        if (visited.has(refId)) {
            return "*" + refId;
        }
        visited.add(refId);
        let object = heap.get(String(refId));
        if (object === undefined) {
            return "{}";
        }
        
        if (isRef(object)) {
            object = objectMap.get(object.id);
        }
        
        let lines = [];
        if (typeof object === "string") {
            lines.push(indent + prefix + JSON.stringify(object));
        } else if (Array.isArray(object)) {
            lines.push(indent + prefix + "[");
            for (let i = 0; i < object.length; i++) {
                let item = object[i];
                lines.push(...renderValue("", indent + "  ", item, heap, visited));
                if (i !== object.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push(indent + "]");
        } else if (object instanceof Map) {
            // map
            // log.write(`Rendering map: ${inspect(object)}\n`);
            lines.push(indent + prefix + "{");
            const keys = Array.from(object.keys());
            // log.write(`map keys: ${keys}\n`);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                const keyDisplay = renderValue("", indent + "  ", key, heap, visited);
                // log.write(`keyDisplay: ${inspect(keyDisplay)}\n`);
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
            lines.push(indent + "  }");
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