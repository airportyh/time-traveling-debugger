import {
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import { inspect } from "util";
import { isHeapRef } from "./language.mjs";

export function StackPane(db, box) {
    const self = {
        updateDisplay,
        get textPane() { return textPane }
    };
    
    const log = db.log;
    const textPane = ScrollableTextPane(db, box);
    
    function updateDisplay() {
        const objectMap = db.cache.objectMap;
        const funCallMap = db.cache.funCallMap;
        const lines = [];
        //log.write("ObjectMap: " + JSON.stringify(Array.from(objectMap.entries())) + "\n");
        let stack = objectMap.get(db.snapshot.stack);
        // log.write(`Stack: ${inspect(stack)}\n`);
        let i = 1;
        while (true) {
            if (!stack) break;
            const frame = objectMap.get(stack[0].id);
            // log.write(`Frame: ${inspect(frame)}\n`);
            const variables = objectMap.get(frame.get("variables").id);
            const funCall = funCallMap.get(frame.get("funCall"));
            lines.push(funCall.fun_name + "()");
            // log.write(`Variables: ${inspect(variables)}\n`);
            // log.write(`FunCall: ${inspect(funCall)}\n`);
            for (let [key, value] of variables.entries()) {
                if (isHeapRef(value)) {
                    value = "*" + value.get("id");
                }
                lines.push(key + " = " + value);
            }
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack[1] && objectMap.get(stack[1].id);
            i += 2;
        }
        textPane.updateAllLines(lines);
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}