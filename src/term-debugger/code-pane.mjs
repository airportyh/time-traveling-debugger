import fetch from "node-fetch";
import {
    printAt,
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import StyledString from "styled_string";

export async function CodePane(db, box) {
    const self = {
        unsetStep,
        updateStep,
        updateDisplay,
        get textPane() { return textPane },
        showCurrentLine() { scrollCodeIfNeeded() }
    };
    
    const log = db.log;
    const textPane = ScrollableTextPane(db, box);
    const funCallMap = db.cache.funCallMap;
    const codeFileMap = db.cache.codeFileMap;
    let codeLines = [];
    let codeFileId = null;
    
    function unsetStep() {
        textPane.updateLine(db.snapshot.line_no - 1, 
            " " + codeLines[db.snapshot.line_no - 1]);
    }
    
    function updateStep() {
        //log.write(`snapshot: ${JSON.stringify(db.snapshot)}\n`);
        const displayLine = ("→" + codeLines[db.snapshot.line_no - 1])
            .padEnd(textPane.longestLineLength, " ");
        //log.write(`displayLine: ${displayLine}\n`);
        textPane.updateLine(db.snapshot.line_no - 1, 
            StyledString(displayLine, {
                background: "white",
                foreground: "black"
            }));
    }
    
    function scrollCodeIfNeeded() {
        const line = db.snapshot.line_no;
        let offset = textPane.scrollTopOffset;
        if (line > (offset + box.height - 1)) {
            offset = Math.min(
                codeLines.length - box.height,
                line - Math.floor(box.height / 2)
            );
        }
        if (line < (offset + 1)) {
            offset = Math.max(0, line - Math.floor(box.height / 2));
        }
        
        textPane.scrollTopTo(offset);
    }
    
    function updateCodeDisplay() {
        const funCall = funCallMap.get(db.snapshot.fun_call_id);
        if (funCall.code_file_id !== codeFileId) {
            codeFileId = funCall.code_file_id;
            if (codeFileId) {
                const codeFile = codeFileMap.get(funCall.code_file_id);
                codeLines = codeFile.source.split("\n");
            } else {
                codeLines = ["<No source code available>"];
            }
            textPane.updateAllLines(codeLines.map((line) => " " + line));
        }
    }
    
    function updateDisplay() {
        updateCodeDisplay();
        scrollCodeIfNeeded();
        updateStep();
    }
    
    async function getSourceCode(url) {
        const response = await fetch(`${url}/api/SourceCode`);
        const data = await response.json();
        return data;
    }
    
    return self;
}