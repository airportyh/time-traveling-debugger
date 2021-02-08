const { spawn } = require('child_process');
const fs = require("mz/fs");

async function main() {
    // const input = (await fs.readFile("history-api/get_python_ast.py")).toString();
    // const p = spawn("python3", ["history-api/get_python_ast.py"]);
    // let output = "";
    // p.stdout.on("data", (chunk) => {
    //     output += chunk;
    // });
    // p.stderr.pipe(process.stderr);
    // p.stdin.write(input);
    // p.stdin.end();
    // p.on("exit", (code) => {
    //     console.log("done");
    //     console.log(output);
    // });
    console.log(await getPythonAST("print('hello world')"))
}

function getPythonAST(code) {
    return new Promise((accept, reject) => {
        const p = spawn("python3", [__dirname + "/get_python_ast.py"]);
        let output = "";
        p.stdout.on("data", (chunk) => {
            output += chunk;
        });
        p.stdin.write(code);
        p.stdin.end();
        p.on("exit", (code) => {
            if (code === 0) {
                accept(output);
            } else {
                reject(new Error("Process exited with " + code));
            }
        });
    });
}

main().catch(err => console.log(err.message));




