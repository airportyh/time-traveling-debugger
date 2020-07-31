const { gatherClosureInfo } = require("./src/closure");
const fs = require("fs");


async function main() {
    const filename = process.argv[2];
    if (!filename) {
        console.log("Please provide a file name.");
        return;
    }
    const ast = JSON.parse((await fs.promises.readFile(filename)).toString());
    
    const closureProviders = new Map();
    const closureDependencies = new Map();
    const info = gatherClosureInfo(ast, [], 0, closureProviders, closureDependencies);
    console.log("closureProviders", closureProviders);
    console.log("closureDependencies", closureDependencies);
}

main().catch((err) => console.log(err.stack));