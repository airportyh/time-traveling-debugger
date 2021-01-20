const inspector = require("inspector");
const sqlite3 = require('better-sqlite3');
const jsonr = require("@airportyh/jsonr");
const fs = require("mz/fs");
const util = require("util");

async function main() {
    const session = new inspector.Session();
    session.connect();
    await startProfiler(session);
    let nextFrameId = 1;
    const db = sqlite3('./database.db');
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
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA cache_size=10000");
    db.exec("PRAGMA synchronous = OFF");
    db.exec("begin transaction");
    
    const insertObject = db.prepare(`insert into Object values (?, ?)`);
    const insertFunCall = db.prepare(`insert into FunCall values (?, ?, ?, ?)`);
    const insertSnapshot = db.prepare(`insert into Snapshot values (?, ?, ?, ?, ?, ?)`);
    
    for (let i = 0; i < history.length; i++) {
        process.stdout.write(`\rPersisting entry ${i + 1} of ${history.length}    `);
        persist(history[i], db, refDict, insertObject, insertFunCall, insertSnapshot);
        if (i % 1000 === 0) {
            db.exec("end transaction");
            db.exec("begin transaction");
        }
    }
    db.exec("end transaction");
    elapsed = new Date() - start;
    console.log("Saving took", elapsed / 1000, "seconds");
    
    const data = await stopProfiler(session);
    await fs.writeFile("./profile.json", JSON.stringify(data.profile));
    console.log("wrote profile.json");
    
    function persist(entry, db, refDict, insertObject, insertFunCall, insertSnapshot) {
        //console.log(entry.type, entry.payload);
        const info = entry.payload;//jsonr.parse(entry.payload, true);
        if (entry.type === "funCall") {
            //console.log("funCall", info);
            const newRefDict = {};
            parameters = registerDefs(info.parameters, newRefDict, new Set());
            for (let id in newRefDict) {
                //console.log(insertObject);
                insertObject.run(id, jsonr.stringify(newRefDict[id]));
            }
            Object.assign(refDict, newRefDict);
            insertFunCall.run(
                info.id,
                info.funName,
                jsonr.stringify(parameters),
                info.parentId
            );
        } else if (entry.type === "snapshot") {
            const newRefDict = {};
            const stack = registerDefs(info.stack, newRefDict, new Set());
            const heap = registerDefs(info.heap, newRefDict, new Set());
            const interops = info.interops ? registerDefs(info.interops, newRefDict, new Set()): null;
            for (let id in newRefDict) {
                insertObject.run(id, jsonr.stringify(newRefDict[id]));
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
            insertSnapshot.run(
                info.id,
                funCall,
                jsonr.stringify(stack),
                jsonr.stringify(heap),
                interops ? jsonr.stringify(interops) : null,
                info.line
            );
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

function startProfiler(session) {
    return new Promise((accept) => {
        session.post('Profiler.enable', () => {
            session.post('Profiler.start', () => {
                accept();
            });
        });
    });
}

function stopProfiler(session) {
    return new Promise((accept, reject) => {
        session.post('Profiler.stop', (err, data) => {
            if (err) {
                reject(err);
                return;
            } else {
                accept(data);
            }
        });
    });
}

main().catch(err => console.log(err.stack));