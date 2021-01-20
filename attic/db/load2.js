const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const jsonr = require("@airportyh/jsonr");
const fs = require("mz/fs");
const util = require("util");

async function main() {
    let nextFrameId = 1;
    const db = await sqlite.open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    const content = (await fs.readFile("./tic-tac-toe.history")).toString();
    const history = JSON.parse(content);
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
    const refDict = {};
    const frameIdDict = {};
    await db.run("PRAGMA journal_mode=WAL");
    await db.run("PRAGMA cache_size=10000");
    await db.run("PRAGMA synchronous = OFF");
    await db.run("begin transaction");
    
    const insertObject = await db.prepare(`insert into Object values (@id, @data)`);
    const insertFunCall = await db.prepare(`insert into FunCall values (@id, @funName, @parameters, @parentId)`);
    const insertSnapshot = await db.prepare(`insert into Snapshot values (@id, @funCall, @stack, @heap, @interops, @lineNo)`);
    
    for (let i = 0; i < history.length; i++) {
        process.stdout.write(`\rPersisting entry ${i + 1} of ${history.length}    `);
        persist(history[i], db, refDict, insertObject, insertFunCall, insertSnapshot);
        if (i % 1000 === 0) {
            db.run("end transaction");
            db.run("begin transaction");
        }
    }
    db.run("end transaction");
    elapsed = new Date() - start;
    console.log("Saving took", elapsed / 1000, "seconds");
    
    async function persist(entry, db, refDict, insertObject, insertFunCall, insertSnapshot) {
        //console.log(entry.type, entry.payload);
        const info = entry.payload;//jsonr.parse(entry.payload, true);
        if (entry.type === "funCall") {
            //console.log("funCall", info);
            const newRefDict = {};
            parameters = registerDefs(info.parameters, newRefDict, new Set());
            for (let id in newRefDict) {
                //console.log(insertObject);
                insertObject.bind({ "@id": id, "@data": jsonr.stringify(newRefDict[id]) });
                insertObject.run();
            }
            Object.assign(refDict, newRefDict);
            insertFunCall.bind({
                "@id": info.id,
                "@funName": info.funName,
                "@parameters": jsonr.stringify(parameters),
                "@parentId": info.parentId
            });
            insertFunCall.run();
        } else if (entry.type === "snapshot") {
            const newRefDict = {};
            const stack = registerDefs(info.stack, newRefDict, new Set());
            const heap = registerDefs(info.heap, newRefDict, new Set());
            const interops = info.interops ? registerDefs(info.interops, newRefDict, new Set()): null;
            for (let id in newRefDict) {
                insertObject.bind({ "@id": id, "@data": jsonr.stringify(newRefDict[id]) });
                insertObject.run();
            }
            Object.assign(refDict, newRefDict);
            let funCall = null;
            if (refDict[stack.id]) {
                funCall = refDict[refDict[stack.id][0].id].funCall;
            }
            if (!funCall) {
                console.log("stack", stack, refDict);
                throw new Error("No funCall");
            }
            insertSnapshot.bind({
                "@id": info.id,
                "@funCall": funCall,
                "@stack": jsonr.stringify(stack),
                "@heap": jsonr.stringify(heap),
                "@interops": interops ? jsonr.stringify(interops) : null,
                "@lineNo": info.line
            });
            insertSnapshot.run();
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