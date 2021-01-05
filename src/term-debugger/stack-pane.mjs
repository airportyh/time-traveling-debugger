import {
    renderText
} from "./term-utils.mjs";

export function StackPane(db, box) {
    const self = {
        updateDisplay,
        scrollUp,
        scrollDown
    };
    
    const log = db.log;
    let topOffset = 0;
    let lines = [];
    
    function updateDisplay() {
        const objectMap = db.cache.objectMap;
        const funCallMap = db.cache.funCallMap;
        lines = [];
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
        softUpdateDisplay();
    }
    
    function softUpdateDisplay() {
        let displayLines = lines;
        if (topOffset < 0) {
            displayLines = lines.slice(-topOffset);
        }
        renderText(box.left, box.top, box.width, box.height, displayLines);
    }
    
    function scrollUp() {
        if (lines.length + topOffset > box.height) {
            topOffset--;
            softUpdateDisplay();
        }
    }
    
    function scrollDown() {
        if (topOffset < 0) {
            topOffset++;
            updateDisplay();
        }
    }
    
    return self;
}

function strTimes(str, num) {
    return Array(num + 1).join(str);
}