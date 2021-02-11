const fs = require("fs");

function clear_screen() {
    write('\x1B[0m')
    write('\x1B[2J')
    write('\x1Bc')
}

function print_at(x, y, value) {
    goto(x, y)
    process.stdout.write(value)
    goto(x, y)
}

function goto(x, y) {
    write(`\x1B[${y};${x}f`)
}

// stoles from charm
function set_cursor_visible(visible) {
    write(visible ? '[?25h' : '[?25l')
}

function write(value) {
    process.stdout.write(value);
}
    
function main() {
    const log = fs.createWriteStream("log.txt");
    process.stdin.setRawMode(true)
    process.stdin.on('data', (data) => {
        if (String(data) === 'q') {
            process.stdin.setRawMode(false)
            write("\n");
            // mouse button off
            // write('\x1b[?1000l');
            // keyboard modifier off
            write(`\x1b[>0;0m`);
            
            process.exit(0)
        }
        log.write("Got data: ");
        for (let i = 0; i < data.length; i++){
            log.write(data[i] + " ");
        }
        log.write("\n");
    });
    clear_screen()
    print_at(5, 5, "Key Modifiers Test!")
    // mouse button on
    // write('\x1b[?1000h');
    // mouse drag
    //write('\x1b[?1002h');
    // SGR
    //write('\x1b[?1006h');
    // mouse motion
    //write('\x1b[?1003h');
    // keyboard modifier
    write('\x1b[>0;1m')
}

main()