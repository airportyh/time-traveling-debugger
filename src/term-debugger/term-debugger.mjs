/*
TODO:
* separate files
* stack parameter rendering
* scrolling code stroll
* scrolling for stack pane
* scrolling for heap pane
* ability to change layout
* help menu
* re-layout when window resize occurs
* color coding of heap ids/objects

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
import { DataCache } from "./data-cache.mjs";
import {
    clearScreen,
    renderText,
    printAt,
    setCursorVisible
} from "./term-utils.mjs";

async function TermDebugger() {
    const self = {
        get apiUrl() { return url },
        get snapshot() { return snapshot },
        get cache() { return cache },
        get log() { return log }
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
    const cache = DataCache();
    const singlePaneWidth = Math.floor((windowWidth - 2) / 3);
    const dividerColumn1 = singlePaneWidth + 1;
    const dividerColumn2 = dividerColumn1 + singlePaneWidth + 1;
    let snapshotId = 1;
    let snapshot = null;
    const codePane = await CodePane(self, {
        top: 1,
        left: 1,
        width: dividerColumn1 - 1,
        height: windowHeight
    });
    const stackPane = StackPane(self, dividerColumn1 + 1, singlePaneWidth);
    const heapPane = HeapPane(self, dividerColumn2 + 1, singlePaneWidth);
    drawDivider(dividerColumn1);
    drawDivider(dividerColumn2);
    await fetchStep();
    codePane.initialDisplay();
    stackPane.updateDisplay();
    heapPane.updateDisplay();
    
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
            heapPane.updateDisplay();
        }
        codePane.updateDisplay();
    }
    
    return self;
}

TermDebugger().catch((e) => console.log(e.stack));

function exit() {
    process.stdin.setRawMode(false);
    setCursorVisible(true);
    process.exit(0);
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


