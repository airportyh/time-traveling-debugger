import fetch from "node-fetch";
import {
    printAt,
    renderText
} from "./term-utils.mjs";
import { ScrollableTextPane } from "./scrollable-text-pane.mjs";
import StyledString from "styled_string";

export function CodePane(db, box) {
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
        const codeFile = getCodeFile();
        if (codeFile) {
            textPane.updateLine(db.snapshot.line_no - 1, 
                " " + codeLines[db.snapshot.line_no - 1]);
        }
    }
    
    function updateStep() {
        const codeFile = getCodeFile();
        if (codeFile) {
            //log.write(`snapshot: ${JSON.stringify(db.snapshot)}\n`);
            const arrow = "→";
            const displayLine = (arrow + codeLines[db.snapshot.line_no - 1])
                .padEnd(textPane.longestLineLength, " ");
            //log.write(`displayLine: ${displayLine}\n`);
            textPane.updateLine(db.snapshot.line_no - 1, 
                StyledString(displayLine, {
                    background: "white",
                    foreground: "black"
                }));
        } else {
            const funCall = funCallMap.get(db.snapshot.fun_call_id);
            codeLines = [`${funCall.fun_name}() line ${db.snapshot.line_no}. No source code available :(`];
            textPane.updateAllLines(codeLines);
        }
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
    
    function getFunCall() {
        return funCallMap.get(db.snapshot.fun_call_id);
    }    
    
    function getCodeFile() {
        const funCall = getFunCall();
        if (funCall.code_file_id) {
            return codeFileMap.get(funCall.code_file_id);
        }
        return null;
    }
    
    function updateCodeDisplay() {
        const funCall = getFunCall();
        if (funCall.code_file_id !== codeFileId) {
            const codeFile = getCodeFile();
            if (codeFile) {
                codeLines = codeFile.source.split("\n");
                codeFileId = codeFile.id;
            } else {
                const funCall = getFunCall();
                codeLines = [`${funCall.fun_name}() line ${db.snapshot.line_no}. No source code available :(`];
                codeFileId = null;
            }
            textPane.updateAllLines(codeLines.map((line) => " " + line));
        }
    }
    
    function updateDisplay() {
        updateCodeDisplay();
        scrollCodeIfNeeded();
        updateStep();
    }
    
    return self;
}