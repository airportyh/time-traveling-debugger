export function renderText(x, y, width, height, textLines) {
    for (let i = 0; i < height; i++) {
        const line = textLines[i] || "";
        printAt(x, y + i, padEnd(line.substring(0, width), width, " "));
    }
}

function padEnd(stringLike, width, padChar) {
    return stringLike.toString() + Array(width - stringLike.length + 1).join(padChar);
}

export function printAt(x, y, value) {
    process.stdout.write(`\x1b[${y};${x}f`);
    process.stdout.write(value);
}

export function setCursorVisible(visible) {
    process.stdout.write(visible ? '\x1b[?25h' : '\x1b[?25l');
}

export function clearScreen() {
    write('\x1b[0m');
    write('\x1b[2J');
    write('\x1bc');
}

export function setMouseButtonTracking(on) {
    if (on) {
        write('\x1b[?1000h');
    } else {
        write('\x1b[?1000l');
    }
}

function write(value) {
    process.stdout.write(value);
}