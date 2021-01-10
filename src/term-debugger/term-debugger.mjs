/*
TODO:

* use i and k for control for qwerty users
* option to choose between stack + heap or rich stack
* finish rotate-list.play
* bug when circular reference (circular-ref.play)
* play lang: when exception, record it in DB and show it in debugger
* code challenges
* ability to change layout
* ability to hide a pane (heap pane for when you are not using heap objects for example)
* re-layout when window resize occurs
* help menu
* allow arrow buttons + current mouse position for scrolling as well
* click to select a stack frame and jump out to that frame
* back button
* current line query
* current line where... query
* color coding of heap ids/objects

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
     
    const [windowWidth, windowHeight] = process.stdout.getWindowSize();
    const topOffset = 1;
    const cache = DataCache();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 2);
    const dividerColumn1 = singlePaneWidth + 1;
    // const dividerColumn2 = dividerColumn1 + singlePaneWidth + 1;
    let snapshotId = 1;
    let snapshot = null;
    
    const codePane = await CodePane(self, {
        top: 1,
        left: 1,
        width: dividerColumn1 - 1,
        height: windowHeight
    });
    const stackPane = RichStackPane(self, {
        top: 1,
        left: dividerColumn1 + 1, 
        width: windowWidth - singlePaneWidth - 1,
        height: windowHeight - 1
    });
    // const heapPane = HeapPane(self, {
    //     top: 1,
    //     left: dividerColumn2 + 1, 
    //     width: windowWidth - 2 * singlePaneWidth - 2,
    //     height: windowHeight
    // });
    
    process.stdin.setRawMode(true);
    process.stdin.on('data', onDataReceived);
    clearScreen();
    setCursorVisible(false);
    setMouseButtonTracking(true);
    
    drawDivider(dividerColumn1);
    // drawDivider(dividerColumn2);
    await fetchStep();
    codePane.initialDisplay();
    stackPane.updateDisplay();
    //heapPane.updateDisplay();
    
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
    
    async function fetchStep() {
        const response = await fetch(`${url}/api/SnapshotExpanded?id=${snapshotId}`);
        snapshot =  await response.json();
        cache.update(snapshot);
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
            cache.update(snapshot);
            snapshotId = snapshot.id;
            stackPane.updateDisplay();
            //heapPane.updateDisplay();
            codePane.updateDisplay();
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
        if (x < dividerColumn1) {
            return codePane;
        } else {
            return stackPane;
        }
        // if (x < dividerColumn1) {
        //     return codePane;
        // } else if (x < dividerColumn2) {
        //     return stackPane;
        // } else {
        //     return heapPane;
        // }
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




