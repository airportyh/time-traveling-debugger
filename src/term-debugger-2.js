/*
TODO:
* stack parameter rendering
* scrolling code stroll
* scrolling for stack pane
* ability to change layout
* heap pane
* help menu
* re-layout when window resize occurs

* step over (done)
* step back over (done)
* step out (done)
* step back out (done)
* stack frame (done)


Notes:

* Partial success for StepOver, but want to skip one more step after the step over
*/

const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const { parse, Ref, stringify } = require("@airportyh/jsonr");

async function CodePane(db, width) {
    const self = {
        unsetStep,
        updateStep,
        initialDisplay,
        updateDisplay
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    let codeLineOffset = 0; // width = dividerColumn1 - 1
    const sourceCode = await getSourceCode(db.apiUrl);
    const codeLines = sourceCode.source.split("\n");
    
    function unsetStep() {
        const line = (" " + codeLines[db.snapshot.line_no - 1])
            .padEnd(width, " ")
            .slice(0, width);
        printAt(1, offset(db.snapshot.line_no), line);
    }
    
    function updateStep() {
        const line = ("→" + codeLines[db.snapshot.line_no - 1])
            .padEnd(width, " ")
            .slice(0, width);
        printAt(1, offset(db.snapshot.line_no), "\x1B[47m\x1B[30m" + line + "\x1B[0m");
    }
    
    function scrollCodeIfNeeded() {
        const line = db.snapshot.line_no;
        if (line > (codeLineOffset + windowHeight - 1)) {
            codeLineOffset = Math.min(
                codeLines.length - windowHeight,
                line - Math.floor(windowHeight / 2));
        }
        if (line < (codeLineOffset + 1)) {
            codeLineOffset = Math.max(0, line - Math.floor(windowHeight / 2));
        }
    }
    
    function updateCodeDisplay() {
        const lines = codeLines.slice(codeLineOffset);
        renderText(2, 1, width - 1, windowHeight, lines);
    }
    
    function initialDisplay() {
        updateCodeDisplay();
        updateStep();
    }
    
    function updateDisplay() {
        const codeLineOffsetBefore = codeLineOffset;
        scrollCodeIfNeeded();
        if (codeLineOffsetBefore !== codeLineOffset) {
            updateCodeDisplay();
        }
        updateStep();
    }
    
    function offset(line) {
        return line - codeLineOffset;
    }
    
    return self;
}

async function StackPane(db, left, width, log) {
    const self = {
        render
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const objectMap = new Map();
    const funCallMap = new Map();
    
    function render() {
        log.write("Snapshot: " + JSON.stringify(db.snapshot, null, "  ") + "\n");
        // Store new object entries in cache
        for (let key in db.snapshot.objectMap) {
            const rawValue = db.snapshot.objectMap[key];
            const parsed = parse(rawValue, true);
            // log.write(
            //     key + ", Raw Value: " + rawValue + ", parsed: " + 
            //     JSON.stringify(parsed, null, "  ") + "\n"
            // );
            objectMap.set(Number(key), parsed);
        }
        
        // Store new fun call entries in cache
        for (let key in db.snapshot.funCallMap) {
            funCallMap.set(Number(key), db.snapshot.funCallMap[key]);
        }
        const lines = [];
        log.write("FunCallMap: " + JSON.stringify(Array.from(funCallMap.entries())) + "\n");
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
            lines.push(strTimes("─", width));
            log.write(JSON.stringify(frame) + ", variables: " + JSON.stringify(variables) + "\n");
            stack = stack[1] && objectMap.get(stack[1].id);
            i += 2;
        }
        renderText(left, 1, width, windowHeight, lines);
        
    }
    
    return self;
}

async function TermDebugger() {
    const self = {
        get apiUrl() { return url },
        get snapshot() { return snapshot }
    };
    
    const log = fs.createWriteStream("term-debug.log");
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
        
        log.write("Data: ");
        for (let i = 0; i < data.length; i++) {
            log.write(data[i] + " ");
        }
        log.write("\n");
        log.write("String: " + String(data) + "\n");
        if (String(data) === 'q') {
            clearScreen();
            exit();
        }
        if (isStepIntoBackwardKey(data)) {
            stepBackward();
        } else if (isStepIntoKey(data)) {
            stepForward();
        } else if (isStepOverKey(data)) {
            stepOver();
        } else if (isStepOverBackwardKey(data)) {
            stepOverBackward();
        } else if (isStepOutKey(data)) {
            stepOut();
        } else if (isStepOutBackwardKey(data)) {
            stepOutBackward();
        }
    });
    
    const url = process.argv[2] || "http://localhost:3000";
    if (!url) {
        console.log("Please provide the URL for the History API.");
        exit();
    }
    
    clearScreen();
    setCursorVisible(false);
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const topOffset = 1;
    const objectMap = new Map();
    const dividerColumn1 = Math.floor(windowWidth / 2);
    let snapshotId = 1;
    let snapshot = null;
    const codePane = await CodePane(self, dividerColumn1 - 1);
    const stackPane = await StackPane(self, dividerColumn1 + 1, Math.ceil(windowWidth / 2), log);
    drawDivider(dividerColumn1);
    await fetchStep();
    codePane.initialDisplay();
    stackPane.render();
    
    function drawDivider(leftOffset) {
        for (let i = 0; i < windowHeight; i++) {
            printAt(leftOffset, i + topOffset, "┃");
        }
    }
    
    async function fetchStep() {
        const response = await fetch(`${url}/api/SnapshotExpanded?id=${snapshotId}`);
        snapshot =  await response.json();
    }
    
    async function stepForward() {
        await stepWithFetchFun(() => fetch(`${url}/api/SnapshotExpanded?id=${snapshotId + 1}`));
    }
    
    async function stepBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/SnapshotExpanded?id=${snapshotId - 1}`));
    }
    
    async function stepOver() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOver?id=${snapshotId}`));
    }
    
    async function stepOverBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOverBackward?id=${snapshotId}`));
    }
    
    async function stepOut() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOut?id=${snapshotId}`));
    }
    
    async function stepOutBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOutBackward?id=${snapshotId}`));
    }
    
    async function stepWithFetchFun(fetchStep) {
        const response = await fetchStep();
        codePane.unsetStep();
        const result = await response.json();
        if (result) {
            snapshot = result;
            snapshotId = snapshot.id;
            stackPane.render();
        }
        codePane.updateDisplay();
    }
    
    return self;
}

TermDebugger().catch((e) => console.log(e.stack));

function strTimes(str, num) {
    return Array(num + 1).join(str);
}

async function getSourceCode(url) {
    const response = await fetch(`${url}/api/SourceCode`);
    const data = await response.json();
    return data;
}

function exit() {
    process.stdin.setRawMode(false);
    setCursorVisible(true);
    process.exit(0);
}

function renderText(x, y, width, height, textLines) {
    for (let i = 0; i < height; i++) {
        const line = textLines[i] || "";
        printAt(x, y + i, line.substring(0, width).padEnd(width, " "));
    }
}

function printAt(x, y, value) {
    process.stdout.write(encode(`[${y};${x}f`));
    process.stdout.write(value);
}

function isStepOverKey(data) {
    return data.length === 1 && data[0] === 116;
}

function isStepOverBackwardKey(data) {
    return data.length === 1 && data[0] === 99;
}

function isStepIntoKey(data) {
    return data.length === 1 && data[0] === 20;
}

function isStepIntoBackwardKey(data) {
    return data.length === 1 && data[0] === 3;
}

function isStepOutKey(data) {
    return data.length === 3 && data[0] === 226 && data[1] === 128 && data[2] === 160;
}

function isStepOutBackwardKey(data) {
    return data.length === 2 && data[0] === 195 && data[1] === 167;
}

function isLeftArrow(data) {
    return data.length === 3 &&
        data[0] === 27 &&
        data[1] === 91 &&
        data[2] === 68;
}

function isRightArrow(data) {
    return data.length === 3 &&
        data[0] === 27 &&
        data[1] === 91 &&
        data[2] === 67;
}

function isUpArrow(data) {
    return data.length === 3 &&
        data[0] === 27 &&
        data[1] === 91 &&
        data[2] === 65;
}

function isDownArrow(data) {
    return data.length === 3 &&
        data[0] === 27 &&
        data[1] === 91 &&
        data[2] === 66;
}

// stoles from charm
function setCursorVisible(visible) {
    process.stdout.write(encode(visible ? '[?25h' : '[?25l'));
}

function clearScreen() {
    process.stdout.write(encode('[0m'));
    process.stdout.write(encode('[2J'));
    process.stdout.write(encode('c'));
}

// Stolen from charm
function encode (xs) {
    function bytes (s) {
        if (typeof s === 'string') {
            return s.split('').map(ord);
        }
        else if (Array.isArray(s)) {
            return s.reduce(function (acc, c) {
                return acc.concat(bytes(c));
            }, []);
        }
    }

    return Buffer.from([ 0x1b ].concat(bytes(xs)));
};

function ord (c) {
    return c.charCodeAt(0)
};