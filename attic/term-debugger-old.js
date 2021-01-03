#!/usr/bin/env node

const fs = require("mz/fs");
const path = require("path");
const jsonr = require("@airportyh/jsonr");

async function main() {
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    let codeLineOffset = 0;
    const topOffset = 1;
    const stackFrameWidth = 40;
    clearScreen();
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
        if (String(data) === 'q') {
            process.stdin.setRawMode(false);
            clearScreen();
            setCursorVisible(true);
            process.exit(0);
        }
        if (isUpArrow(data)) {
            stepBackward();
        } else if (isDownArrow(data)) {
            stepForward();
        }
    });
    const filePath = process.argv[2];
    if (!filePath) {
        console.log("Please provide a file name.");
        return;
    }

    setCursorVisible(false);
    clearScreen();

    const code = (await fs.readFile(filePath)).toString();
    const codeLines = code.split("\n");
    const codeWidth = codeLines.reduce((longestWidth, line) =>
        line.length > longestWidth ? line.length : longestWidth, 0);

    const maxLineNumberLength = String(codeLines.length).length;
    const dividerColumn = codeWidth + maxLineNumberLength + 5;
    drawDivider(dividerColumn);
    drawDivider(dividerColumn + stackFrameWidth);

    const historyFilePath = path.join(
        path.dirname(filePath),
        path.basename(filePath, ".play") + ".history"
    );

    const history = jsonr.parse((await fs.readFile(historyFilePath)).toString());
    let currentHistoryIdx = 0;

    updateDisplay();

    // ========// UI/Stateful Helper functions ==============

    function renderStackFrame() {
        const column = dividerColumn + 1;
        const histEntry = history[currentHistoryIdx];
        const stack = histEntry.stack;
        const lines = [];
        for (let i = stack.length - 1; i >= 0; i--) {
            renderFrame(stack[i], column, lines);
        }
        renderText(column, 1, stackFrameWidth - 1, windowHeight, lines);
    }

    function renderFrame(frame, column, lines) {
        const paramList = Object.keys(frame.parameters)
            .map(key => `${key}=${displayValue(frame.parameters[key])}`)
            .join(", ");
        const funDisplay = `${frame.funName}(${paramList})`.substring(0, stackFrameWidth - 1);
        lines.push(funDisplay);
        for (let varName in frame.variables) {
            lines.push(`  ${varName} = ${displayValue(frame.variables[varName])}`);
        }
    }

    function stepForward() {
        if (currentHistoryIdx + 1 >= history.length) {
            return;
        }

        eraseProgramCounter();
        currentHistoryIdx++;
        scrollCodeIfNeeded();
        updateDisplay();
    }

    function stepBackward() {
        if (currentHistoryIdx - 1 < 0) {
            return;
        }

        eraseProgramCounter();
        currentHistoryIdx--;
        scrollCodeIfNeeded();
        updateDisplay();
    }

    function updateDisplay() {
        renderCodeLines(codeLines);
        renderProgramCounter();
        renderStackFrame();
        updateHistoryDisplay();
        renderHeap();
    }

    function updateHistoryDisplay() {
        const histEntry = history[currentHistoryIdx];
        const line = histEntry.line;
        const display = `Step ${currentHistoryIdx + 1} of ${history.length}`;
        renderText(1, windowHeight, windowWidth, 1, [display]);
        park();
    }

    function scrollCodeIfNeeded() {
        const histEntry = history[currentHistoryIdx];
        const line = histEntry.line;
        if (line > (codeLineOffset + windowHeight - 1)) {
            codeLineOffset = Math.min(
                codeLines.length - windowHeight,
                line - Math.floor(windowHeight / 2));
        }
        if (line < (codeLineOffset + 1)) {
            codeLineOffset = Math.max(0, line - Math.floor(windowHeight / 2));
        }
    }

    function eraseProgramCounter() {
        const histEntry = history[currentHistoryIdx];
        const line = histEntry.line;
        printAt(1, line + topOffset - 1 - codeLineOffset, " ");
    }

    function renderProgramCounter() {
        const histEntry = history[currentHistoryIdx];
        const line = histEntry.line;
        printAt(1, line + topOffset - 1 - codeLineOffset, "→");
        park();
    }

    function renderHeap() {
        const column = dividerColumn + stackFrameWidth + 1;
        const histEntry = history[currentHistoryIdx];
        const heap = histEntry.heap;
        let offsetTop = 1;
        let lines = [];
        for (let id in heap) {
            const object = heap[id];
            if (Array.isArray(object)) {
                renderArray(id, object, lines);
            } else {
                renderDictionary(id, object, lines);
            }
        }
        renderText(column, 1, windowWidth - column + 1, windowHeight, lines);
    }

    function renderArray(id, array, lines) {
        const displayItems = array.map(displayValue);
        lines.push(
            id + "┌" +
            displayItems.map(item => "".padEnd(item.length, "─")).join("┬") +
            "┐");
        if (displayItems.length > 0) {
            lines.push(
                "".padEnd(id.length, " ") +
                "│" + displayItems.join("│") + "│");
        }
        lines.push(
            "".padEnd(id.length, " ") +
            "└" + displayItems.map(item => "".padEnd(item.length, "─")).join("┴") +
             "┘");
    }

    function renderDictionary(id, dict, lines) {
        const entries = [];
        for (let key in dict) {
            entries.push([displayValue(key), displayValue(dict[key])]);
        }
        const column1Width = entries.reduce((width, entry) =>
            entry[0].length > width ? entry[0].length : width, 1);
        const column2Width = entries.reduce((width, entry) =>
            entry[1].length > width ? entry[1].length : width, 1);

        lines.push(id +
            "┌" + Array(column1Width + 1).join("─") +
            "┬" + Array(column2Width + 1).join("─") +
            "┐");
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            lines.push(
                "".padEnd(id.length, " ") +
                "│" + entry[0].padEnd(column1Width, " ") +
                "│" + entry[1].padEnd(column2Width, " ") +
                "│");

            if (i < entries.length - 1) {
                lines.push(
                    "".padEnd(id.length, " ") +
                    "├" + "".padEnd(column1Width, "─") +
                    "┼" + "".padEnd(column2Width, "─") +
                    "┤");
            }
        }
        lines.push("".padEnd(id.length, " ") +
            "└" + Array(column1Width + 1).join("─") +
            "┴" + Array(column2Width + 1).join("─") +
            "┘");
    }

    function park() {
        printAt(1, windowHeight, "");
    }

    function drawDivider(leftOffset) {
        for (let i = 0; i < windowHeight; i++) {
            printAt(leftOffset, i + topOffset, "║");
        }
    }

    function renderCodeLines(codeLines) {
        const codeWidth = codeLines.reduce((longestWidth, line) =>
            line.length > longestWidth ? line.length : longestWidth, 0);
        const histEntry = history[currentHistoryIdx];
        const line = histEntry.line;
        const maxLineNumberLength = String(codeLines.length).length;
        renderText(
            maxLineNumberLength + 1,
            1,
            codeWidth,
            windowHeight - 1,
            codeLines.slice(codeLineOffset)
        );
    }
}

main().catch((e) => console.log(e.stack));

// ============= Helper functions ================

function displayValue(value) {
    if (typeof value === "object") {
        return "<" + value.id + ">";
    } else if (typeof value === "string") {
        return quote(value);
    } else {
        return String(value);
    }
}

function quote(str) {
    return '"' + str.replace(/\"/g, '\\"') + '"';
}

function renderText(x, y, width, height, textLines) {
    for (let i = 0; i < height; i++) {
        const line = textLines[i] || "";
        printAt(x, y + i, line.substring(0, width).padEnd(width, " "));
    }
}

function clearScreen() {
    process.stdout.write(encode('[0m'));
    process.stdout.write(encode('[2J'));
    process.stdout.write(encode('c'));
}

function printAt(x, y, value) {
    process.stdout.write(encode(`[${y};${x}f`));
    process.stdout.write(value);
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
