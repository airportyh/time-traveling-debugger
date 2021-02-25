/*
TODO:

* allow collapsing of data structures
* hover over source to see value
* zoom-in/zoom-out effect when going into or coming out of frame
* current line where... query
* last-mutation-of query
* make use of references when rendering heap objects when it makes sense. Show anchoring ids
* allow arrow buttons + current mouse position for scrolling as well
* click to select a stack frame and jump out to that frame
* ability to change layout
* ability to hide a pane (heap pane for when you are not using heap objects for example)
* re-layout when window resize occurs
* help menu
* back button
* color coding of heap ids/objects

* current line query (done)
* show current snapshot number and other info in status bar
* indicator on the side to show whether you are before or after the line (done)
* bug in heap string rendering (two_sum.py) (done)
* bug shape_calculator.py floats showing as {} (done)
* support multiple files (done)
* bug when circular reference (circular-ref.play) (done)
* play lang: when exception, record it in DB and show it in debugger (done)
* option to choose between stack + heap or rich stack (done)
* use i and k for control for qwerty users (done)
* stack parameter rendering (done)
* styled function signatures in stack frame (done)
* make a short alias for node src/term-debugger/term-debugger.mjs (done)
* inlined object display on the stack similar to chrome (done)
* bring back current line highlight (styled string) (done)
* horizontal scroll (done)
* ENTER to re-center code pane to current line (done)
* scrolling code stroll (done)
* scrolling for stack pane (done)
* scrolling for heap pane (done)
* separate files (done)
* heap pane (done)
* step over (done)
* step back over (done)
* step out (done)
* step back out (done)
* stack frame (done)


*/

import path from "path";
import fetch from "node-fetch";
import fs from "fs";
import { CodePane } from "./code-pane.mjs";
import { HeapPane } from "./heap-pane.mjs";
import { StackPane } from "./stack-pane.mjs";
import { RichStackPane } from "./rich-stack-pane.mjs";
import { DataCache } from "./data-cache.mjs";
import {
    clearScreen,
    renderText,
    printAt,
    setCursorVisible,
    setMouseButtonTracking
} from "./term-utils.mjs";
import { HistoryServer } from "./spawn-history-server.mjs";
import simpleSleep from "simple-sleep";
import StyledString from "styled_string";
import { inspect } from "util";
import exitHook from "exit-hook";

function TermDebugger() {
    const self = {
        get apiUrl() { return url },
        get snapshot() { return snapshot },
        get cache() { return cache },
        get log() { return log },
        fastForward,
        rewind,
        start,
        cleanUp
    };
    
    const log = fs.createWriteStream("term-debug.log");
    
    let url;
    let historyServer;
    const argument = process.argv[2];
    const mode = process.argv[3];
    let cache;
    let snapshot;
    let screen;
    let windowWidth, windowHeight;
    
    async function start() {
        if (!argument) {
            console.log("Please provide either a URL or a file.");
            exit();
        }
        
        if (argument.startsWith("http://")) {
            url = argument;
        } else {
            url = "http://localhost:1337";
            // start the history server
            log.write(`Starting history API server\n`);
            historyServer = HistoryServer(argument, 1337);
            await historyServer.start();
        }
        
        cache = DataCache(self);
        
        snapshot = null;
        
        process.stdin.setRawMode(true);
        process.stdin.on('data', onDataReceived);
        clearScreen();
        setCursorVisible(false);
        setMouseButtonTracking(true);
        
        [windowWidth, windowHeight] = process.stdout.getWindowSize();
        
        if (mode === "low") {
            screen = LowLevelScreen(self);
        } else {
            screen = HighLevelScreen(self);
        }
        await fetchFirstStep();
        screen.updateDisplay();
        updateStatusBar();
    }
    
    function onDataReceived(data) {
        log.write("Data: ");
        for (let i = 0; i < data.length; i++) {
            log.write(data[i] + " ");
        }
        log.write("\n");
        log.write("String: " + JSON.stringify(String(data)) + "\n");
        if (String(data) === 'q') {
            clearScreen();
            exit();
        }
        if (isDownArrow(data)) {
            stepOver();
        } else if (isUpArrow(data)) {
            stepOverBackward();
        } else if (isStepIntoKey(data)) {
            stepForward();
        } else if (isStepOutKey(data)) {
            stepOut();
        } else if (isMouseClick(data)) {
            const x = data[4] - 32;
            const y = data[5] - 32;
            if (screen.isPointInCodePane(x, y)) {
                const lineNo = screen.codePane.getLineNoForY(y);
                fastForward(lineNo);
            }
        } else if (isCtrlMouseClick(data) || isRightMouseClick(data)) {
            const x = data[4] - 32;
            const y = data[5] - 32;
            if (screen.isPointInCodePane(x, y)) {
                const lineNo = screen.codePane.getLineNoForY(y);
                rewind(lineNo);
            }
        } else if (isWheelUpEvent(data)) {
            scrollUp(data);
        } else if (isWheelDownEvent(data)) {
            scrollDown(data);
        } else if (isWheelUpAltEvent(data)) {
            scrollLeft(data);
        } else if (isWheelDownAltEvent(data)) {
            scrollRight(data);
        } else if (isEnter(data)) {
            codePane.showCurrentLine();
        }
    }
    
    function drawDivider(leftOffset) {
        for (let i = 0; i < windowHeight; i++) {
            printAt(leftOffset, i + topOffset, "┃");
        }
    }
    
    function logSnapshot(snapshot) {
        // log.write(`Snapshot ${snapshot.id}: ${JSON.stringify(snapshot, null, "  ")}\n`);
        log.write(`Snapshot ${snapshot && snapshot.id}, ${snapshot && snapshot.state}\n`);
    }
    
    async function fetchFirstStep() {
        let start = new Date();
        const response = await fetch(`${url}/api/SnapshotWithError`);
        const result =  await response.json();
        let end = new Date();
        log.write(`${`${url}/api/SnapshotWithError`} took ${end - start}ms.\n`);
        if (result) {
            snapshot = result;
            logSnapshot(snapshot);
            await cache.update(snapshot);
        } else {
            let start = new Date();
            const response = await fetch(`${url}/api/SnapshotExpanded?id=1`);
            snapshot =  await response.json();
            let end = new Date();
            log.write(`${`${url}/api/SnapshotExpanded?id=1`} took ${end - start}ms.\n`);
            logSnapshot(snapshot);
            await cache.update(snapshot);
        }
    }
    
    async function stepForward() {
        await stepWithFetch(`${url}/api/SnapshotExpanded?id=${snapshot.id + 1}`);
    }
    
    async function stepBackward() {
        await stepWithFetch(`${url}/api/SnapshotExpanded?id=${snapshot.id - 1}`);
    }
    
    async function stepOver() {
        await stepWithFetch(`${url}/api/StepOver?id=${snapshot.id}`);
    }
    
    async function stepOverBackward() {
        await stepWithFetch(`${url}/api/StepOverBackward?id=${snapshot.id}`);
    }
    
    async function stepOut() {
        await stepWithFetch(`${url}/api/StepOut?id=${snapshot.id}`);
    }
    
    async function stepOutBackward() {
        await stepWithFetch(`${url}/api/StepOutBackward?id=${snapshot.id}`);
    }
    
    async function fastForward(lineNo) {
        const funCall = cache.funCallMap.get(snapshot.fun_call_id);
        const codeFileId = funCall.code_file_id;
        await stepWithFetch(`${url}/api/FastForward?from=${snapshot.id}&code_file_id=${codeFileId}&line_no=${lineNo}`);
    }
    
    async function rewind(lineNo) {
        const funCall = cache.funCallMap.get(snapshot.fun_call_id);
        const codeFileId = funCall.code_file_id;
        await stepWithFetch(`${url}/api/Rewind?from=${snapshot.id}&code_file_id=${codeFileId}&line_no=${lineNo}`);
    }
    
    async function stepWithFetch(url) {
        let start = new Date();
        const response = await fetch(url);
        screen.unsetStep();
        const result = await response.json();
        let end = new Date();
        log.write(`${url} took ${end - start}ms.\n`);
        logSnapshot(result);
        if (result) {
            snapshot = result;
            await cache.update(snapshot);
            updateStatusBar();
        }
        screen.updateDisplay();
    }
    
    function updateStatusBar() {
        let funCall = cache.funCallMap.get(snapshot.fun_call_id);
        let fun = cache.funMap.get(funCall.fun_id);
        let message = `Snapshot ${snapshot.id}  ${fun.name}()  line ${snapshot.line_no}`;
        let color;
        if (snapshot.error) {
            message += `, Error: ${snapshot.error.message || snapshot.error.type}`;
            color = "red";
        } else {
            color = "blue";
        }
        const leftPadding = Math.max(0, Math.floor((windowWidth - message.length) / 2));
        const banner = (Array(leftPadding + 1).join(" ") + message + 
            Array(Math.max(0, windowWidth - leftPadding - message.length + 1)).join(" "))
            .substring(0, windowWidth);
        printAt(1, windowHeight, 
            StyledString(banner, { foreground: color, background: "white" }).toString());
    }
    
    function scrollUp(data) {
        const x = data[4] - 32;
        const targetPane = pickTargetPane(x);
        targetPane.textPane.scrollUp();
    }
    
    function scrollDown(data) {
        const x = data[4] - 32;
        const targetPane = pickTargetPane(x);
        targetPane.textPane.scrollDown();
    }
    
    function scrollLeft(data) {
        const x = data[4] - 32;
        const targetPane = pickTargetPane(x);
        targetPane.textPane.scrollLeft();
    }
    
    function scrollRight(data) {
        const x = data[4] - 32;
        const targetPane = pickTargetPane(x);
        targetPane.textPane.scrollRight();
    }
    
    function pickTargetPane(x) {
        return screen.pickTargetPane(x);
    }
    
    function cleanUp() {
        process.stdin.setRawMode(false);
        setCursorVisible(true);
        setMouseButtonTracking(false);
        if (historyServer) {
            historyServer.stop();
        }
    }
    
    function exit() {
        cleanUp();
        process.exit(0)
    }
    
    return self;
}

function HighLevelScreen(db) {
    const self = {
        initialDisplay,
        updateDisplay,
        pickTargetPane,
        unsetStep,
        isPointInCodePane,
        get codePane() { return codePane }
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 2);
    const dividerColumn1 = singlePaneWidth + 1;
    const codePane = CodePane(db, {
        top: 1,
        left: 1,
        width: dividerColumn1 - 1,
        height: windowHeight - 1
    });
    const stackPane = RichStackPane(db, {
        top: 1,
        left: dividerColumn1 + 1, 
        width: windowWidth - singlePaneWidth - 1,
        height: windowHeight - 1
    });
    drawDivider(dividerColumn1);
    
    function drawDivider(leftOffset) {
        for (let i = 0; i < windowHeight - 1; i++) {
            printAt(leftOffset, i + 1, "┃");
        }
    }
    
    function unsetStep() {
        codePane.unsetStep();
    }
    
    function initialDisplay() {
        codePane.initialDisplay();
        stackPane.updateDisplay();
    }
    
    function updateDisplay() {
        stackPane.updateDisplay();
        codePane.updateDisplay();
    }
    
    function pickTargetPane(x) {
        if (x < dividerColumn1) {
            return codePane;
        } else {
            return stackPane;
        }
    }
    
    function isPointInCodePane(x, y) {
        return x < dividerColumn1;
    }
    
    return self;
}

function LowLevelScreen(db) {
    const self = {
        initialDisplay,
        updateDisplay,
        pickTargetPane,
        unsetStep,
        isPointInCodePane,
        get codePane() { return codePane }
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 3);
    const dividerColumn1 = singlePaneWidth + 1;
    const dividerColumn2 = dividerColumn1 + singlePaneWidth + 1;
    const codePane = CodePane(db, {
        top: 1,
        left: 1,
        width: dividerColumn1 - 1,
        height: windowHeight - 1
    });
    const stackPane = StackPane(db, {
        top: 1,
        left: dividerColumn1 + 1, 
        width: singlePaneWidth,
        height: windowHeight - 1
    });
    const heapPane = HeapPane(db, {
        top: 1,
        left: dividerColumn2 + 1, 
        width: windowWidth - 2 * singlePaneWidth - 2,
        height: windowHeight - 1
    });
    drawDivider(dividerColumn1);
    drawDivider(dividerColumn2);
    
    function drawDivider(leftOffset) {
        for (let i = 0; i < windowHeight - 1; i++) {
            printAt(leftOffset, i + 1, "┃");
        }
    }
    
    function unsetStep() {
        codePane.unsetStep();
    }
    
    function initialDisplay() {
        codePane.initialDisplay();
        stackPane.updateDisplay();
        heapPane.updateDisplay();
    }
    
    function updateDisplay() {
        stackPane.updateDisplay();
        heapPane.updateDisplay();
        codePane.updateDisplay();
    }
    
    function isPointInCodePane(x, y) {
        return x < dividerColumn1;
    }
    
    function pickTargetPane(x) {
        if (x < dividerColumn1) {
            return codePane;
        } else if (x < dividerColumn2) {
            return stackPane;
        } else {
            return heapPane;
        }
    }
    
    return self;
}

const db = TermDebugger();
exitHook(db.cleanUp);

db.start().catch((e) => {
    console.log(e.stack)
});

function isStepIntoKey(data) {
    return String(data) === "i";
}

function isStepOutKey(data) {
    return String(data) === "o";
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

function isEnter(data) {
    return data.length === 1 && data[0] === 13;
}

function isWheelUpEvent(data) {
    return (data.length ===  6 || data.length === 12) && 
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 97;
}

function isWheelDownEvent(data) {
    return (data.length ===  6 || data.length === 12) && 
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 96;
}

function isWheelUpAltEvent(data) {
    return (data.length ===  6 || data.length === 12) && 
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 105;
}

function isWheelDownAltEvent(data) {
    return (data.length ===  6 || data.length === 12) && 
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 104;
}

function isMouseClick(data) {
    return (data.length === 6) &&
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 35;
}

function isRightMouseClick(data) {
    return (data.length === 6) &&
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 34;
}

function isCtrlMouseClick(data) {
    return (data.length === 6) &&
        data[0] === 27 && data[1] === 91 && data[2] === 77 && data[3] === 51;
}




