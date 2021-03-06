import { renderText } from "./term-utils.mjs";

export function ScrollableTextPane(db, box) {
    const self = {
        updateAllLines,
        updateLine,
        scrollTopTo,
        scrollUp() { scrollTopTo(topOffset + 1) },
        scrollDown() { scrollTopTo(topOffset - 1) },
        scrollLeftTo,
        scrollLeft() { scrollLeftTo(leftOffset - 1) },
        scrollRight() { scrollLeftTo(leftOffset + 1) },
        get scrollTopOffset() { return topOffset },
        get scrollLeftOffset() { return leftOffset },
        textLines() { return textLines },
        get longestLineLength() { return longestLineLength }
    };
    
    let textLines = [];
    
    const log = db.log;
    let topOffset = 0;
    let leftOffset = 0;
    let longestLineLength = 0;
    
    function updateAllLines(lines) {
        textLines = lines;
        longestLineLength = 0;
        for (let line of textLines) {
            longestLineLength = Math.max(longestLineLength, line.length);
        }
        scrollTopTo(topOffset);
    }
    
    function softUpdateDisplay() {
        let displayLines = textLines;
        if (topOffset > 0) {
            displayLines = textLines.slice(topOffset);
        }
        if (leftOffset > 0) {
            displayLines = displayLines.map((line) => line.substring(leftOffset));
        }
        renderText(box.left, box.top, box.width, box.height, displayLines);
    }
    
    function updateLine(i, line) {
        textLines[i] = line;
        const displayLine = textLines[i].substring(leftOffset);
        renderText(box.left, box.top - topOffset + i, box.width, 1, [displayLine]);
    }
    
    function scrollTopTo(offset) {
        topOffset = Math.max(0, 
            Math.min(
                textLines.length - box.height,
                offset
            )
        );
        softUpdateDisplay();
    }
    
    function scrollLeftTo(offset) {
        leftOffset = Math.max(0,
            Math.min(
                longestLineLength - box.width,
                offset
            )
        );
        softUpdateDisplay();
    }
    
    return self;
}