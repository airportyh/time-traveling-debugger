import { renderText } from "./term-utils";

export function ScrollableTextPane(box, textLines) {
    const self = {
        updateAllLines,
        updateLine,
        scrollTo,
        textLines() { return textLines }
    };
    
    if (!textLines) {
        textLines = [];
    }
    
    let topOffset = 0;
    
    function updateAllLines(lines) {
        textLines = lines;
        scrollTo(topOffset);
    }
    
    function softUpdateDisplay() {
        let displayLines = textLines;
        if (topOffset < 0) {
            displayLines = lines.slice(-topOffset);
        }
        renderText(box.left, box.top, box.width, box.height, displayLines);
    }
    
    function updateLine(i, line) {
        textLines[i] = line;
        renderText(box.left, box.top + topOffset, box.width, 1, [textLines[i]]);
    }
    
    function scrollTo(offset) {
        topOffset = Math.min(
            box.height - lines.length,
            Math.max(0, offset)
        );
        softUpdateDisplay();
    }
    
    return self;
}