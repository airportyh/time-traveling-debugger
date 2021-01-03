import fetch from "node-fetch";
import {
    printAt,
    renderText
} from "./term-utils.mjs";

export async function CodePane(db, box) {
    const self = {
        unsetStep,
        updateStep,
        initialDisplay,
        updateDisplay
    };
    
    let codeLineOffset = 0; // width = dividerColumn1 - 1
    const sourceCode = await getSourceCode(db.apiUrl);
    const codeLines = sourceCode.source.split("\n");
    
    function unsetStep() {
        const line = (" " + codeLines[db.snapshot.line_no - 1])
            .padEnd(box.width, " ")
            .slice(0, box.width);
        printAt(box.left, offset(db.snapshot.line_no), line);
    }
    
    function updateStep() {
        const line = ("→" + codeLines[db.snapshot.line_no - 1])
            .padEnd(box.width, " ")
            .slice(0, box.width);
        printAt(box.left, offset(db.snapshot.line_no), "\x1B[47m\x1B[30m" + line + "\x1B[0m");
    }
    
    function scrollCodeIfNeeded() {
        const line = db.snapshot.line_no;
        if (line > (codeLineOffset + box.height - 1)) {
            codeLineOffset = Math.min(
                codeLines.length - box.height,
                line - Math.floor(box.height / 2));
        }
        if (line < (codeLineOffset + 1)) {
            codeLineOffset = Math.max(0, line - Math.floor(box.height / 2));
        }
    }
    
    function updateCodeDisplay() {
        const lines = codeLines.slice(codeLineOffset);
        renderText(box.left + 1, box.top, box.width - 1, box.height, lines);
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
        return box.top - 1 + line - codeLineOffset;
    }
    
    async function getSourceCode(url) {
        const response = await fetch(`${url}/api/SourceCode`);
        const data = await response.json();
        return data;
    }
    
    return self;
}