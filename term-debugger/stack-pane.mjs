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
    const cache = db.cache;
    
    function updateDisplay() {
        const lines = [];
        //log.write("ObjectMap: " + JSON.stringify(Array.from(objectMap.entries())) + "\n");
        let stack = cache.getObject(db.snapshot.stack);
        log.write(`Stack: ${inspect(stack)}\n`);
        let i = 1;
        while (true) {
            if (!stack) break;
            // log.write(`Frame: ${inspect(frame)}\n`);
            const variables = cache.getObject(stack.get("variables").id);
            const funCall = cache.getFunCall(stack.get("funCall"));
            const fun = cache.getFun(funCall.fun_id);
            lines.push(fun.name + "()");
            // log.write(`Variables: ${inspect(variables)}\n`);
            // log.write(`FunCall: ${inspect(funCall)}\n`);
            for (let [key, value] of variables.entries()) {
                if (isHeapRef(value)) {
                    value = "*" + value.id;
                }
                lines.push(key + " = " + value);
            }
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack && stack.get("parent") && cache.getObject(stack.get("parent").id);
            i += 2;
        }
        textPane.updateAllLines(lines);
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}