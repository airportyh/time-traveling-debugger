export function renderText(x, y, width, height, textLines) {
    for (let i = 0; i < height; i++) {
        const line = textLines[i] || "";
        printAt(x, y + i, line.substring(0, width).padEnd(width, " "));
    }
}

export function printAt(x, y, value) {
    process.stdout.write(encode(`[${y};${x}f`));
    process.stdout.write(value);
}

export function setCursorVisible(visible) {
    process.stdout.write(encode(visible ? '[?25h' : '[?25l'));
}

export function clearScreen() {
    process.stdout.write(encode('[0m'));
    process.stdout.write(encode('[2J'));
    process.stdout.write(encode('c'));
}

// Stolen from charm
export function encode (xs) {
    function bytes (s) {
        if (typeof s === 'string') {
            return s.split('').map(ord);
        }
        else if (Array.isArray(s)) {
            return s.reduce(function (acc, c) {
                return acc.concat(bytes(c));
            }, []);
        }
    }

    return Buffer.from([ 0x1b ].concat(bytes(xs)));
};

export function ord (c) {
    return c.charCodeAt(0)
};