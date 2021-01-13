/*
TODO:

* current line query
* current line where... query
* make use of references when rendering heap objects when it makes sense. Show anchoring ids
* allow arrow buttons + current mouse position for scrolling as well
* click to select a stack frame and jump out to that frame
* ability to change layout
* ability to hide a pane (heap pane for when you are not using heap objects for example)
* re-layout when window resize occurs
* help menu
* back button
* color coding of heap ids/objects

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


Notes:

* Partial success for StepOver, but want to skip one more step after the step over
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
import { HistoryServer } from "../spawn-history-server.mjs";
import simpleSleep from "simple-sleep";
import StyledString from "styled_string";

async function TermDebugger() {
    const self = {
        get apiUrl() { return url },
        get snapshot() { return snapshot },
        get cache() { return cache },
        get log() { return log }
    };
    
    const log = fs.createWriteStream("term-debug.log");
    
    let url;
    let historyServer;
    const argument = process.argv[2];
    const mode = process.argv[3];
    
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
    
    const cache = DataCache();
    
    let snapshot = null;
    
    process.stdin.setRawMode(true);
    process.stdin.on('data', onDataReceived);
    clearScreen();
    setCursorVisible(false);
    setMouseButtonTracking(true);
    
    let screen;
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    
    if (mode === "low") {
        screen = await LowLevelScreen(self);
    } else {
        screen = await HighLevelScreen(self);
    }
    await fetchFirstStep();
    screen.initialDisplay();
    displayError();
    
    function onDataReceived(data) {
        log.write("Data: (");
        for (let i = 0; i < data.length; i++) {
            log.write(data[i] + " ");
        }
        log.write(")\n");
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
    
    async function fetchFirstStep() {
        const response = await fetch(`${url}/api/SnapshotWithError`);
        const result =  await response.json();
        if (result) {
            snapshot = result;
            cache.update(snapshot);
        } else {
            const response = await fetch(`${url}/api/SnapshotExpanded?id=1`);
            snapshot =  await response.json();
            cache.update(snapshot);
        }
    }
    
    async function stepForward() {
        await stepWithFetchFun(() => fetch(`${url}/api/SnapshotExpanded?id=${snapshot.id + 1}`));
    }
    
    async function stepBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/SnapshotExpanded?id=${snapshot.id - 1}`));
    }
    
    async function stepOver() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOver?id=${snapshot.id}`));
    }
    
    async function stepOverBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOverBackward?id=${snapshot.id}`));
    }
    
    async function stepOut() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOut?id=${snapshot.id}`));
    }
    
    async function stepOutBackward() {
        await stepWithFetchFun(() => fetch(`${url}/api/StepOutBackward?id=${snapshot.id}`));
    }
    
    async function stepWithFetchFun(fetchStep) {
        const response = await fetchStep();
        screen.unsetStep();
        const result = await response.json();
        if (result) {
            snapshot = result;
            cache.update(snapshot);
            screen.updateDisplay();
            displayError();
        }
    }
    
    function displayError() {
        if (snapshot.error) {
            const message = "Error: " + snapshot.error.message;
            const leftPadding = Math.floor((windowWidth - message.length) / 2);
            const banner = Array(leftPadding + 1).join(" ") + message + Array(windowWidth - leftPadding - message.length + 1).join(" ")
            printAt(1, windowHeight, 
                StyledString(banner, { foreground: "red", background: "white" }).toString());
        } else {
            printAt(1, windowHeight, Array(windowWidth + 1).join(" "));
        }
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
    
    function exit() {
        process.stdin.setRawMode(false);
        setCursorVisible(true);
        setMouseButtonTracking(false);
        if (historyServer) {
            historyServer.stop();
        }
        process.exit(0);
    }
    
    return self;
}

async function HighLevelScreen(db) {
    const self = {
        initialDisplay,
        updateDisplay,
        pickTargetPane,
        unsetStep
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 2);
    const dividerColumn1 = singlePaneWidth + 1;
    const codePane = await CodePane(db, {
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
    
    return self;
}

async function LowLevelScreen(db) {
    const self = {
        initialDisplay,
        updateDisplay,
        pickTargetPane,
        unsetStep
    };
    
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 3);
    const dividerColumn1 = singlePaneWidth + 1;
    const dividerColumn2 = dividerColumn1 + singlePaneWidth + 1;
    const codePane = await CodePane(db, {
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

TermDebugger().catch((e) => console.log(e.stack));

function isStepOverKey(data) {
    return data.length === 1 && (data[0] === 116 || data[0] === 107);
}

function isStepOverBackwardKey(data) {
    return data.length === 1 && (data[0] === 99 || data[0] === 105);
}

function isStepIntoKey(data) {
    return data.length === 1 && (data[0] === 20 || data[0] === 11);
}

function isStepIntoBackwardKey(data) {
    return data.length === 1 && (data[0] === 3 || data[0] === 9);
}

function isStepOutKey(data) {
    return (data.length === 3 && data[0] === 226 && data[1] === 128 && data[2] === 160) ||
        (data.length === 2 && data[0] === 203 && data[1] === 154);
}

function isStepOutBackwardKey(data) {
    return (data.length === 2 && data[0] === 195 && data[1] === 167) ||
        (data.length === 2 && data[0] === 203 && data[1] === 134);
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




