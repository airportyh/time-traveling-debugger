const express = require("express");
const cors = require('cors');
const sqlite3 = require("better-sqlite3");
const session = require('express-session');
const { parse, Ref, HeapRef } = require("../json-like/json-like");
const { spawn } = require('child_process');

const filename = process.argv[2];
if (!filename) {
    console.log("Please provide a SQLite Database file that contains a program's history.");
    process.exit(-1);
}

const app = express();
const port = process.argv[3] || 1337;
app.use(cors());
app.use(session({
    secret: 'ABCDEFG'
}));

const db = sqlite3(filename);
const getFunCallStatement = db.prepare("select * from FunCall where id is ?");
const getFunCallByParentStatement = db.prepare("select * from FunCall where parent_id is ?");
const getChildFunCallIds = db.prepare("select id from FunCall where parent_id is ?");
const getFun = db.prepare("select * from Fun where id = ?");
const getSnapshotsByFunCall = db.prepare("select * from Snapshot where fun_call_id = ?");
const getSnapshotsIdsByFunCall = db.prepare("select id from Snapshot where fun_call_id = ?");
const getFirstSnapshotInFunCall = db.prepare(`
    select *
    from Snapshot
    where id < ?
        and fun_call_id = ?
    order by id limit 1`);
const getLastSnapshotInFunCall = db.prepare(`
    select *
    from Snapshot
    where id > ?
        and fun_call_id = ?
    order by id desc limit 1`);
const getSnapshotById = db.prepare("select * from Snapshot where id = ?");
const getError = db.prepare("select * from Error limit 1");
const getErrorBySnapshotId = db.prepare("select * from Error where snapshot_id = ?");
const getNextSnapshotWithFunCallId = db.prepare(`
    select *
    from Snapshot
    where id > ?
        and fun_call_id = ?
    limit 1`);
const getPrevSnapshotWithFunCallId = db.prepare(`
    select *
    from Snapshot
    where id < ?
        and fun_call_id = ?
    order by id desc limit 1`);
const getObjectStatement = db.prepare("select * from Object where id = ?");
const getErrorStatement = db.prepare("select * from Error where id = ?");
const getCodeFile = db.prepare("select * from CodeFile where id = ?");
const getSnapshotForStepOver = db.prepare(`
    select *
    from Snapshot
    where id > ? 
        and (
            (fun_call_id = ? and line_no != ?) 
            or (fun_call_id == ?)
        )
    order by id limit 1
`);
const getSnapshotForStepOver2 = db.prepare(`
    select *
    from Snapshot
    where id > ?
        and fun_call_id = ?
    order by id limit 1`);
const getSnapshotForStepOverBackward = db.prepare(`
    select * from Snapshot
    where id < ?
        and (
            (fun_call_id = ? and line_no != ?) or 
            (fun_call_id == ?)
        )
    order by id desc limit 1
`);
const getSnapshotForStepOverBackward2 = db.prepare(`
    select *
    from Snapshot
    where id < ?
        and fun_call_id = ?
    order by id desc limit 1
`);
const getHeapByVersion = db.prepare(`
    select id, max(object_id) as oid
    from HeapRef
    where heap_version <= ?
    group by id
`);
const getHeapRef = db.prepare(`
    select *
    from HeapRef
    where id = ?
        and heap_version <= ?
    order by heap_version desc limit 1
`);
const fastForwardStatement = db.prepare(`
    select Snapshot.*
    from Snapshot 
    inner join FunCall on (Snapshot.fun_call_id = FunCall.id)
    inner join Fun on (FunCall.fun_id = Fun.id)
    where Fun.code_file_id = ?
        and Snapshot.line_no = ?
        and Snapshot.id > ? order by id limit 1
`);
const rewindStatement = db.prepare(`
    select Snapshot.*
    from Snapshot 
    inner join FunCall on (Snapshot.fun_call_id = FunCall.id)
    inner join Fun on (FunCall.fun_id = Fun.id)
    where Fun.code_file_id = ?
        and Snapshot.line_no = ?
        and Snapshot.id < ? order by id desc limit 1
`);

app.get("/api/RootFunCall", (req, res) => {
    const firstSnapshot = getSnapshotById.get(1);
    const funCallId = firstSnapshot.fun_call_id;
    res.json(fetchFunCallBasic(funCallId, req));
});

app.get("/api/FunCall", (req, res) => {
    const parentId = req.query.parentId || null;
    const result = getFunCallByParentStatement.all(parentId);
    res.json(result);
});

app.get("/api/Snapshot", (req, res) => {
    const funCallId = req.query.funCallId || null;
    let result = null;
    const id = req.query.id || null;
    if (id) {
        result = [getSnapshotById.get(id)];
    } else if (funCallId) {
        result = getSnapshotsByFunCall.all(funCallId);
    }
    res.json(result);
});

app.get("/api/Object", (req, res) => {
    let ids = req.query.id;
    if (!Array.isArray(ids)) {
        ids = [ids];
    }
    if (!ids) {
        res.json([]);
    } else {
        const result = getObjects(ids);
        res.json(result);
    }
});

app.get("/api/Fun", (req, res) => {
    const id = req.query.id;
    const result = getFun.get(id);
    res.json(result);
});

app.get("/api/CodeFile", (req, res) => {
    const id = req.query.id;
    const result = getCodeFile.get(id);
    res.json(result);
});

app.get("/api/FunCallExpanded", (req, res) => {
    const id = req.query.id;
    res.json(fetchFunCallExpanded(id, req));
});

function fetchFunCallBasic(id, req) {
    const alreadyFetched = useAlreadyFetched(req);
    const funCall = getFunCallStatement.get(id);
    const attachments = {};
    fetchFunCallFunAndCodeFile(funCall, attachments, alreadyFetched);
    const retval = {
        ...funCall,
        attachments
    };
    return retval;
}

function fetchFunCallExpanded(id, req) {
    const alreadyFetched = useAlreadyFetched(req);
    const funCall = getFunCallStatement.get(id);
    const attachments = {};
    getAttachmentsForFunCall(funCall, attachments, alreadyFetched);
    const retval = {
        ...funCall,
        attachments
    };
    return retval;
}

function getAttachmentsForFunCall(funCall, attachments, alreadyFetched) {
    // child fun call IDs
    const childFunCallIdsKey = "FunCall/" + funCall.id + "/ChildFunCallIds";
    if (!isIn(childFunCallIdsKey, alreadyFetched)) {
        const childFunCallIds = getChildFunCallIds.all(funCall.id).map((o) => o.id);
        alreadyFetched[childFunCallIdsKey] = true;
        attachments[childFunCallIdsKey] = childFunCallIds;
        
        // Child calls
        const childrenToFetch = childFunCallIds
            .filter((id) => !isIn("FunCall/" + id, alreadyFetched));
        const childFunCalls = db.prepare(
            `select * from FunCall where id in (
                ${childrenToFetch.map(() => "?").join(", ")}
            )`
        ).all(...childrenToFetch);
        for (let child of childFunCalls) {
            const key = "FunCall/" + child.id;
            alreadyFetched[key] = true;
            attachments[key] = child;
            
            fetchFunCallFunAndCodeFile(child, attachments, alreadyFetched);
        }
    }
    
    const snapshotIdsKey = "FunCall/" + funCall.id + "/SnapshotIds";
    
    if (!isIn(snapshotIdsKey, alreadyFetched)) {
        const snapshotIds = getSnapshotsIdsByFunCall.all(funCall.id).map((o) => o.id);
        alreadyFetched[snapshotIdsKey] = true;
        attachments[snapshotIdsKey] = snapshotIds;
        
        // Snapshots
        const snapshotsToFetch = snapshotIds
            .filter((id) => !isIn("Snapshot/" + id, alreadyFetched));
        
        const snapshots = db.prepare(
            `select * from Snapshot where id in (
                ${snapshotsToFetch.map(() => "?").join(", ")}
            )`
        ).all(...snapshotsToFetch);
        
        // Objects referenced by snapshots
        for (let i = 0; i < snapshots.length; i++) {
            const snapshot = snapshots[i];
            const snapshotKey = "Snapshot/" + snapshot.id;
            alreadyFetched[snapshotKey] = true;
            attachments[snapshotKey] = snapshot;
            getObjectsForSnapshot(snapshot, funCall, attachments, alreadyFetched);
        }
    }
    
    fetchFunCallFunAndCodeFile(funCall, attachments, alreadyFetched);
}

function fetchFunCallFunAndCodeFile(funCall, attachments, alreadyFetched) {
    // Fun
    const funKey = "Fun/" + funCall.fun_id;
    if (!isIn(funKey, alreadyFetched)) {
        const fun = getFun.get(funCall.fun_id);
        attachments[funKey] = fun;
        alreadyFetched[funKey] = true;
        
        // Code file
        const codeFileKey = "CodeFile/" + fun.code_file_id;
        if (!isIn(codeFileKey, alreadyFetched)) {
            const codeFile = getCodeFile.get(fun.code_file_id);
            attachments[codeFileKey] = codeFile;
            alreadyFetched[codeFileKey] = true;
        }
    }
}

function getObjectsForSnapshot(snapshot, funCall, attachments, alreadyFetched) {
    if (snapshot.id == 247) {
        debugger
    }
    getObjectsDeep(
        new HeapRef(funCall.locals), 
        snapshot.heap,
        attachments,
        alreadyFetched
    );
    if (funCall.globals) {
        getObjectsDeep(
            new HeapRef(funCall.globals), 
            snapshot.heap,
            attachments,
            alreadyFetched
        );
    }
    if (funCall.closure_cellvars) {
        const cellvars = parse(funCall.closure_cellvars);
        for (let cellvar of cellvars.values()) {
            getObjectsDeep(
                cellvar,
                snapshot.heap,
                attachments,
                alreadyFetched
            );
        }
    }
    if (funCall.closure_freevars) {
        const freevars = parse(funCall.closure_freevars);
        for (let freevar of freevars.values()) {
            getObjectsDeep(
                freevar,
                snapshot.heap,
                attachments,
                alreadyFetched
            );
        }
    }
    
}

app.get("/api/SnapshotExpanded", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const id = req.query.id;
    const snapshot = getSnapshotById.get(id);
    res.json(expandSnapshot(snapshot, alreadyFetched));
});

app.get("/api/SnapshotWithError", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const error = getError.get();
    if (!error) {
        res.json(null);
        return;
    }
    const snapshot = getSnapshotById.get(error.snapshot_id);
    res.json(expandSnapshot(snapshot, alreadyFetched));
});

app.get("/api/StepOver", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    let id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    let result = getSnapshotForStepOver.get(
        id, snapshot.fun_call_id, snapshot.line_no, snapshotFunCall.parent_id);
    let lastSnapshot = getLastSnapshotInFunCall.get(id, snapshot.fun_call_id);
    if (lastSnapshot && result && lastSnapshot.id < result.id) {
        // we don't skip the last snapshot of the fun call, because we want to show
        // the return value of the function
        result = lastSnapshot;
    }
    if (!result) {
        // This is for when you get to the last line in the program execution
        // this allows you get to the end if the last line happens to be a function call
        result = getSnapshotForStepOver2.get(id, snapshot.fun_call_id);
    }
    res.json(expandSnapshot(result, alreadyFetched));
});

app.get("/api/StepOverBackward", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    let result;
    const firstSnapshot = getFirstSnapshotInFunCall.get(id, snapshot.fun_call_id);
    const prevSnapshot = getSnapshotForStepOverBackward.get(
        id, snapshot.fun_call_id, snapshot.line_no, snapshotFunCall.parent_id);
    if (prevSnapshot) {
        if (firstSnapshot && firstSnapshot.id > prevSnapshot.id) {
            result = firstSnapshot;
        } else {
            if (prevSnapshot.fun_call_id === snapshot.fun_call_id) {
                const prevSnapshotFunCall = getFunCallStatement.get(prevSnapshot.fun_call_id);
                const prevPrevSnapshot = getSnapshotForStepOverBackward.get(
                    prevSnapshot.id, prevSnapshot.fun_call_id, prevSnapshot.line_no, prevSnapshotFunCall.parent_id);
                if (prevPrevSnapshot) {
                    if (firstSnapshot && firstSnapshot.id > prevPrevSnapshot.id) {
                        result = firstSnapshot;
                    } else {
                        const prevPrevSnapshotFunCall = getFunCallStatement.get(prevPrevSnapshot.fun_call_id);
                        result = getSnapshotForStepOver.get(
                            prevPrevSnapshot.id, prevPrevSnapshot.fun_call_id, prevPrevSnapshot.line_no, snapshotFunCall.parent_id) || 
                            prevPrevSnapshot;
                    }
                } else {
                    result = prevSnapshot;
                }
            } else {
                result = prevSnapshot;
            }
        }
    } else {
        result = getSnapshotForStepOverBackward2.get(snapshot.id, snapshot.fun_call_id);
    }
    res.json(expandSnapshot(result, alreadyFetched));
});

app.get("/api/StepOut", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getNextSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    res.json(expandSnapshot(nextSnapshot, alreadyFetched));
});

app.get("/api/FastForward", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const snapshotId = req.query.from;
    const lineNo = req.query.line_no;
    const codeFileId = req.query.code_file_id;
    const snapshot = fastForwardStatement.get(codeFileId, lineNo, snapshotId);
    return res.json(expandSnapshot(snapshot, alreadyFetched));
});

app.get("/api/Rewind", (req, res) => {
    const alreadyFetched = useAlreadyFetched(req);
    const snapshotId = req.query.from;
    const lineNo = req.query.line_no;
    const codeFileId = req.query.code_file_id;
    const snapshot = rewindStatement.get(codeFileId, lineNo, snapshotId);
    return res.json(expandSnapshot(snapshot, alreadyFetched));
});

// app.get("/api/StepOutBackward", (req, res) => {
//     const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
//     const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
//     const id = Number(req.query.id);
//     const snapshot = getSnapshotById.get(id);
//     const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
//     const nextSnapshot = getPrevSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
//     res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
// });

function useAlreadyFetched(req) {
    if (!req.session.alreadyFetched) {
        req.session.alreadyFetched = {};
    }
    return req.session.alreadyFetched;
}

function expandSnapshot(snapshot, alreadyFetched) {
    if (!snapshot) {
        return null;
    }
    const attachments = {};
    getAttachmentsForSnapshot(snapshot, attachments, alreadyFetched);
    let error = getErrorBySnapshotId.get(snapshot.id);
    return {
        ...snapshot,
        attachments,
        error
    };
}

function getAttachmentsForSnapshot(snapshot, attachments, alreadyFetched) {
    let funCallId = snapshot.fun_call_id;
    // ancestor calls
    while (true) {
        if (!funCallId) {
            break;
        }
        const key = "FunCall/" + funCallId;
        if (isIn(key, alreadyFetched)) {
            break;
        }
        let funCall = getFunCallStatement.get(funCallId);
        attachments[key] = funCall;
        alreadyFetched[key] = true;
        
        getObjectsForSnapshot(snapshot, funCall, attachments, alreadyFetched);
        
        funCallId = funCall.parent_id;
    }
    
    const myFunCall = attachments["FunCall/" + snapshot.fun_call_id];
    if (myFunCall) {
        // get fun and code file if needed
        
        const funKey = "Fun/" + myFunCall.fun_id;
        if (!isIn(funKey, alreadyFetched)) {
            const fun = getFun.get(myFunCall.fun_id);
            attachments[funKey] = fun;
            alreadyFetched[funKey] = true;
            
            const codeFileKey = "CodeFile/" + fun.code_file_id;
            if (!isIn(codeFileKey, alreadyFetched)) {
                const codeFile = getCodeFile.get(fun.code_file_id);
                attachments[codeFileKey] = codeFile;
                alreadyFetched[codeFileKey] = true;
            }
        }
    }
}

function getObjectsDeep(ref, heapVersion, attachments, alreadyFetched) {
    let dbObject;
    let id;
    let objKey;
    if (ref instanceof Ref) {
        id = ref.id;
        objKey = "Object/" + id;
    } else if (ref instanceof HeapRef) {
        const heapRefKey = "HeapRef/" + heapVersion + "/" + ref.id;
        if (isIn(heapRefKey, alreadyFetched)) {
            return;
        } else {
            const dbHeapRef = getHeapRef.get(ref.id, heapVersion);
            if (!dbHeapRef) {
                attachments[heapRefKey] = null;
                return;
            }
            id = dbHeapRef.object_id;
            attachments[heapRefKey] = id;
            objKey = "Object/" + id;
        }
    } else {
        return;
    }
    // if (isIn(objKey, alreadyFetched)) {
    //     return;
    // } else {
    dbObject = getObject(id);    
    // }
    attachments[objKey] = dbObject.data;
    alreadyFetched[objKey] = true;
    const object = parse(dbObject.data, true);
    if (object.__tag__ === "function") {
        const funId = object.get("fun_id");
        const fun = getFun.get(funId);
        const funKey = "Fun/" + funId;
        attachments[funKey] = fun;
        alreadyFetched[funKey] = true;
    }
    if (Array.isArray(object)) {
        for (let j = 0; j < object.length; j++) {
            let item = object[j];
            getObjectsDeep(item, heapVersion, attachments, alreadyFetched);
        }
    } else if (object instanceof Map) {
        object.forEach((value, key) => {
            getObjectsDeep(key, heapVersion, attachments, alreadyFetched);
            getObjectsDeep(value, heapVersion, attachments, alreadyFetched);
        });
    }
}

function getObject(id) {
    return getObjectStatement.get(id);
}

function getObjects(ids) {
    const binds = Array(ids.length).join("?, ") + "?";
    const statement = "select * from Object where id in (" + binds + ")";
    const result = db.prepare(statement).all(...ids);
    return result;
}

function getPythonAST(code) {
    return new Promise((accept, reject) => {
        const p = spawn("python3.9", [__dirname + "/get_python_ast.py"]);
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

app.get("/api/PythonAST", async (req, res) => {
    const code_file_id = req.query.id;
    const file = getCodeFile.get(code_file_id);
    const ast = await getPythonAST(file.source);
    res.set('Content-Type', 'application/json');
    res.write(ast);
    res.end();
});

function isIn(key, obj) {
    return key in obj;
}

app.listen(port, () => {
    console.log(`Listening on ${port}`);
});