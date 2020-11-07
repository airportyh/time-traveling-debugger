const jsonr = require("@airportyh/jsonr");
const fs = require("mz/fs");
const util = require("util");

async function main() {
    const content = (await fs.readFile("./tic-tac-toe.history")).toString();
    const history = JSON.parse(content);
    const refDict = {};
    const frameIdDict = {};
    const fd = await fs.open("database-log.txt", 'w');
    let start = new Date();
    let elapsed;
    for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        process.stdout.write(`\rParsing entry ${i + 1} of ${history.length}    `);
        entry.payload = jsonr.parse(entry.payload, true);
    }
    elapsed = new Date() - start;
    console.log("Parsing took", elapsed / 1000, "seconds");
    start = new Date();
    for (let i = 0; i < history.length; i++) {
        process.stdout.write(`\rPersisting entry ${i + 1} of ${history.length}    `);
        persist(history[i], refDict, fd);    
    }
    elapsed = new Date() - start;
    console.log("Saving took", elapsed / 1000, "seconds");
    
    async function persist(entry, refDict, fd) {
        //console.log(entry.type, entry.payload);
        const info = entry.payload;
        if (entry.type === "funCall") {
            //console.log("funCall", info);
            const newRefDict = {};
            const parameters = registerDefs(info.parameters, newRefDict, new Set());
            for (let id in newRefDict) {
                const insertObject = `insert into Object values (${id}, ${jsonr.stringify(newRefDict[id])})`;
                await fs.write(fd, insertObject);
            }
            Object.assign(refDict, newRefDict);
            await fs.write(fd, `insert into FunCall values (${info.id}, ${info.funName}, ${jsonr.stringify(parameters)}, ${info.parentId})`);
        } else if (entry.type === "snapshot") {
            const newRefDict = {};
            const stack = registerDefs(info.stack, newRefDict, new Set());
            const heap = registerDefs(info.heap, newRefDict, new Set());
            const interops = info.interops ? registerDefs(info.interops, newRefDict, new Set()): null;
            for (let id in newRefDict) {
                const insertObject = `insert into Object values (${id}, ${jsonr.stringify(newRefDict[id])})`;
                await fs.write(fd, insertObject);
            }
            Object.assign(refDict, newRefDict);
            let funCall = null;
            if (refDict[stack.id]) {
                funCall = refDict[refDict[stack.id][0].id].funCall;
            }
            const insertSnapshot = `insert into Snapshot values (${info.id}, ${funCall}, ${jsonr.stringify(stack)}, ${jsonr.stringify(heap)}, ${interops ? jsonr.stringify(interops) : null}, ${info.line})`;
            await fs.write(fd, insertSnapshot);
        }
    }

}

function registerDefs(value, refDict, visited) {
    if (visited.has(value)) {
        return value;
    }

    visited.add(value);

    if (value instanceof jsonr.Def) {
        refDict[value.id] = value.object;
        registerDefs(value.object, refDict, visited);
        return new jsonr.Ref(value.id);
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = registerDefs(value[i], refDict, visited);
        }
    } else if (typeof value === "object") {
        for (let key in value) {
            value[key] = registerDefs(value[key], refDict, visited);
        }
    }
    return value;
}

main().catch(err => console.log(err.stack));