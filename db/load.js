const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const jsonr = require("@airportyh/jsonr");
const fs = require("mz/fs");
const SQL = require('sql-template-strings');
const util = require("util");

async function main() {
    let nextFrameId = 1;
    const db = await sqlite.open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    const content = (await fs.readFile("../ex/tic-tac-toe.history")).toString();
    const history = jsonr.parse(content, true);
    const refDict = {};
    const frameIdDict = {};
    for (let i = 0; i < history.length; i++) {
        console.log("Persisting entry", i + 1);
        await persist(i + 1, history[i], db, refDict, frameIdDict);
    }
    
    async function persist(id, entry, db, refDict, frameIdDict) {
        // create heap objects
        // create stack frame(s)
        //console.log("entry before registerDefs", util.inspect(entry, { depth: 10 }));
        const newRefDict = {};
        entry = registerDefs(entry, newRefDict, new Set);
        Object.assign(refDict, newRefDict);
        //console.log("refDict", refDict);
        //console.log("entry", util.inspect(entry, { depth: 10 }));
        const _stack = entry.stack;
        const stack = resolveRef(entry.stack, refDict);
        const _frame = stack[stack.length - 1];
        const _parentFrame = stack[stack.length - 2];
        const parentFrameId = _parentFrame ? frameIdDict[_parentFrame.id] : null;
        let frameId;
        let createFrame;
        if (_frame instanceof jsonr.Ref) {
            if (_frame.id in newRefDict) {
                frameId = nextFrameId++;
                frameIdDict[_frame.id] = frameId;
                createFrame = true;
            } else {
                createFrame = false;
                frameId = frameIdDict[_frame.id];
            }
        } else {
            createFrame = true;
            frameId = nextFrameId++;
        }
        const frame = resolveRef(_frame, refDict);
        const funName = frame.funName;
        for (let id in newRefDict) {
            if (id === String(_frame.id) || id === String(_stack.id)) {
                continue;
            }
            const insertObject = SQL`insert into Object values (${id}, ${jsonr.stringify(refDict[id])})`;
            console.log(insertObject);
            await db.run(insertObject);
            
        }
        
        const parameters = jsonr.stringify(frame.parameters);
        const variables = jsonr.stringify(frame.variables);
        if (createFrame) {
            if (_frame.id === undefined) {
                console.log("No frame id found:", _frame, frame);
            }
            const insertStackFrame = SQL`insert into StackFrame values (${frameId}, ${funName}, ${parameters}, ${variables}, ${parentFrameId})`;
            console.log(insertStackFrame);
            await db.run(insertStackFrame);
        }
        
        // create history entry
        const insertHistoryEntry = SQL`insert into HistoryEntry values (${id}, ${frameId}, ${jsonr.stringify(entry.heap)}, ${entry.interop ? jsonr.stringify(entry.interop): null}, ${entry.line})`;
        console.log(insertHistoryEntry);
        await db.run(insertHistoryEntry);
    }

}

function resolveRef(value, refDict) {
    if (value instanceof jsonr.Ref) {
        return refDict[value.id];
    } else {
        return value;
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