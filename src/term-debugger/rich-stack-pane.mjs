import {
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import { isRef } from "./language.mjs"
import StyledString from "styled_string";

export function RichStackPane(db, box) {
    const self = {
        updateDisplay,
        get textPane() { return textPane }
    };
    
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
            const variables = objectMap.get(frame.variables.id);
            const funCall = funCallMap.get(frame.funCall);
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
            for (let key in variables) {
                let value = variables[key];
                lines.push(...renderValue(key + " = ", "", value, heap, new Set()));
            }
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack[1] && objectMap.get(stack[1].id);
            i += 2;
        }
        
        textPane.updateAllLines(lines);
    }
    
    function renderValue(prefix, indent, value, heap, visited) {
        if (isRef(value)) {
            const localVisited = new Set(visited);
            const oneLine = renderHeapObjectOneLine(value, heap, localVisited);
            if (prefix.length + oneLine.length < box.width) {
                for (let id of localVisited) {
                    visited.add(id);
                }
                return [indent + prefix + oneLine];
            } else {
                return renderHeapObjectMultiLine(prefix, indent, value, heap, visited);
            }
        } else {
            return [indent + prefix + JSON.stringify(value)];
        }
    }
    
    function renderHeapObjectMultiLine(prefix, indent, ref, heap, visited) {
        if (visited.has(ref.id)) {
            return "*" + ref.id;
        }
        visited.add(ref.id);
        let object = heap[ref.id];
        
        if (isRef(object)) {
            object = objectMap.get(object.id);
        }
        
        let lines = [];
        if (Array.isArray(object)) {
            lines.push(indent + prefix + "[");
            for (let i = 0; i < object.length; i++) {
                let item = object[i];
                lines.push(...renderValue("", indent + "  ", item, heap, visited));
                if (i !== object.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push(indent + "]");
        } else {
            // object
            lines.push(indent + prefix + "{");
            
            const keys =  Object.keys(object);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let value = object[key];
                lines.push(...renderValue(key + ": ", indent + "  ", value, heap, visited));
                if (i !== keys.length - 1) {
                    lines[lines.length - 1] += ", ";
                }
            }
            lines.push(indent + "}");
        }
        return lines;
    }
    
    function renderHeapObjectOneLine(ref, heap, visited) {
        log.write(`renderHeapObjectOneLine(${ref.id}, ${JSON.stringify(heap)}, ${Array.from(visited)})\n`);
        if (visited.has(ref)) {
            return "*" + ref.id;
        }
        visited.add(ref);
        let object = heap[ref.id];
        
        if (isRef(object)) {
            object = objectMap.get(object.id);
        }
        if (Array.isArray(object)) {
            let outputs = object.map((item) => {
                if (isRef(item)) {
                    return renderHeapObjectOneLine(item, heap, visited);
                } else {
                    return JSON.stringify(item);
                }
            });
            return "[" + outputs.join(", ") + "]";
        } else {
            // object
            let outputs = [];
            for (let key in object) {
                let value = object[key];
                if (isRef(value)) {
                    outputs.push(key + ": " + renderHeapObjectOneLine(value, heap, visited));
                } else {
                    outputs.push(key + ": " + JSON.stringify(value));
                }
            }
            return "{" + outputs.join(", ") + "}";
        }
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}