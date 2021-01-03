import {
    renderText
} from "./term-utils.mjs";

export function StackPane(db, box) {
    const self = {
        updateDisplay
    };
    
    const log = db.log;
    
    function updateDisplay() {
        const objectMap = db.cache.objectMap;
        const funCallMap = db.cache.funCallMap;
        const lines = [];
        //log.write("ObjectMap: " + JSON.stringify(Array.from(objectMap.entries())) + "\n");
        let stack = objectMap.get(db.snapshot.stack);
        //log.write("Stack: " + JSON.stringify(stack) + "\n");
        let i = 1;
        while (true) {
            if (!stack) break;
            const frame = objectMap.get(stack[0].id);
            const variables = objectMap.get(frame.variables.id);
            const funCall = funCallMap.get(frame.funCall);
            lines.push(funCall.fun_name + "()");
            for (let key in variables) {
                let value = variables[key];
                if (value instanceof Object && ("id" in value)) {
                    value = "*" + value.id;
                }
                lines.push(key + " = " + value);
            }
            lines.push(strTimes("─", box.width));
            //log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack[1] && objectMap.get(stack[1].id);
            i += 2;
        }
        renderText(box.left, box.top, box.width, box.height, lines);
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}