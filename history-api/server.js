const express = require("express");
const cors = require('cors');
const sqlite3 = require("better-sqlite3");
const session = require('express-session');
const { parse, Ref, HeapRef } = require("../json-like/json-like-parser");
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
const getSnapshotsByFunCall = db.prepare("select * from Snapshot where fun_call_id = ?");
const getSnapshotById = db.prepare("select * from Snapshot where id = ?");
const getError = db.prepare("select * from Error limit 1");
const getErrorBySnapshotId = db.prepare("select * from Error where snapshot_id = ?");
const getNextSnapshotWithFunCallId = db.prepare("select * from Snapshot where id > ? and fun_call_id = ? limit 1");
const getPrevSnapshotWithFunCallId = db.prepare("select * from Snapshot where id < ? and fun_call_id = ? order by id desc limit 1");
const getObjectStatement = db.prepare("select * from Object where id = ?");
const getErrorStatement = db.prepare("select * from Error where id = ?");
const getCodeFile = db.prepare("select * from CodeFile where id = ?");
const getSnapshotForStepOver = db.prepare("select * from Snapshot where id > ? and ((fun_call_id = ? and line_no != ?) or (fun_call_id == ?)) order by id limit 1");
const getSnapshotForStepOver2 = db.prepare("select * from Snapshot where id > ? and fun_call_id = ? order by id limit 1");
const getSnapshotForStepOverBackward = db.prepare("select * from Snapshot where id < ? and ((fun_call_id = ? and line_no != ?) or (fun_call_id == ?)) order by id desc limit 1");
const getSnapshotForStepOverBackward2 = db.prepare("select * from Snapshot where id < ? and fun_call_id = ? order by id desc limit 1");
const getHeapByVersion = db.prepare("select id, max(object_id) as oid from HeapRef where heap_version <= ? group by id");
const getHeapRef = db.prepare("select * from HeapRef where id = ? and heap_version <= ? order by heap_version desc limit 1");

app.get("/api/FunCall", (req, res) => {
    const parentId = req.query.parentId || null;
    const result = getFunCallByParentStatement.all(parentId);
    res.json(result);
});

app.get("/api/Snapshot", (req, res) => {
    const funCallId = req.query.funCallId || null;
    const result = getSnapshotsByFunCall.all(funCallId);
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

app.get("/api/CodeFile", (req, res) => {
    const id = req.query.id;
    const result = getCodeFile.get(id);
    res.json(result);
});

app.get("/api/FunCallExpanded", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = req.query.id;
    const funCall = getFunCallStatement.get(id);
    const childFunCalls = getFunCallByParentStatement.all(id);
    const snapshots = getSnapshotsByFunCall.all(id);
    const objectMap = {};
    const heapMap = {};
    fetchObjectsForFunCall(funCall, objectMap, heapMap, objectsAlreadyFetched);
    const retval = {
        ...funCall,
        childFunCalls,
        snapshots,
        objectMap,
        heapMap
    };
    res.json(retval);
});

function fetchObjectsForFunCall(funCall, objectMap, heapMap, objectsAlreadyFetched) {
    const snapshots = getSnapshotsByFunCall.all(funCall.id);
    for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        getObjectsDeep2(
            new HeapRef(funCall.locals), 
            objectMap, 
            snapshot.heap,
            heapMap,
            objectsAlreadyFetched);
        if (funCall.globals) {
            getObjectsDeep2(
                new HeapRef(funCall.globals), 
                objectMap, 
                snapshot.heap,
                heapMap,
                objectsAlreadyFetched);
        }
        if (funCall.closure_cellvars) {
            const cellvars = parse(funCall.closure_cellvars);
            for (let cellvar of cellvars.values()) {
                getObjectsDeep2(
                    cellvar,
                    objectMap, 
                    snapshot.heap,
                    heapMap,
                    objectsAlreadyFetched);
            }
        }
        if (funCall.closure_freevars) {
            const freevars = parse(funCall.closure_freevars);
            for (let freevar of freevars.values()) {
                getObjectsDeep2(
                    freevar,
                    objectMap, 
                    snapshot.heap,
                    heapMap,
                    objectsAlreadyFetched);
            }
        }
    }
}

app.get("/api/SnapshotExpanded", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = req.query.id;
    const snapshot = getSnapshotById.get(id);
    res.json(expandSnapshot(snapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
});

app.get("/api/SnapshotWithError", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const error = getError.get();
    if (!error) {
        res.json(null);
        return;
    }
    const snapshot = getSnapshotById.get(error.snapshot_id);
    res.json(expandSnapshot(snapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
});

app.get("/api/StepOver", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    let id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    let result = getSnapshotForStepOver.get(
        id, snapshot.fun_call_id, snapshot.line_no, snapshotFunCall.parent_id);
    if (!result) {
        // This is for when you get to the last line in the program execution
        // this allows you get to the end if the last line happens to be a function call
        result = getSnapshotForStepOver2.get(id, snapshot.fun_call_id);
    }
    res.json(expandSnapshot(result, objectsAlreadyFetched, funCallsAlreadyFetched));
});

app.get("/api/StepOverBackward", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    let result;
    const prevSnapshot = getSnapshotForStepOverBackward.get(
        id, snapshot.fun_call_id, snapshot.line_no, snapshotFunCall.parent_id);
    if (prevSnapshot) {
        if (prevSnapshot.fun_call_id === snapshot.fun_call_id) {
            const prevSnapshotFunCall = getFunCallStatement.get(prevSnapshot.fun_call_id);
            const prevPrevSnapshot = getSnapshotForStepOverBackward.get(
                prevSnapshot.id, prevSnapshot.fun_call_id, prevSnapshot.line_no, prevSnapshotFunCall.parent_id);
            if (prevPrevSnapshot) {
                const prevPrevSnapshotFunCall = getFunCallStatement.get(prevPrevSnapshot.fun_call_id);
                result = getSnapshotForStepOver.get(
                    prevPrevSnapshot.id, prevPrevSnapshot.fun_call_id, prevPrevSnapshot.line_no, snapshotFunCall.parent_id) || 
                    prevPrevSnapshot;
            } else {
                result = prevSnapshot;
            }
        } else {
            result = prevSnapshot;
        }
    } else {
        result = getSnapshotForStepOverBackward2.get(snapshot.id, snapshot.fun_call_id);
    }
    res.json(expandSnapshot(result, objectsAlreadyFetched, funCallsAlreadyFetched));
});

app.get("/api/StepOut", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getNextSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
});

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

app.get("/api/PythonAST", async (req, res) => {
    const code_file_id = req.query.id;
    const file = getCodeFile.get(code_file_id);
    const ast = await getPythonAST(file.source);
    res.set('Content-Type', 'application/json');
    res.write(ast);
    res.end();
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

function useObjectsAlreadyFetched(req) {
    if (!req.session.objectsAlreadyFetched) {
        req.session.objectsAlreadyFetched = {};
    };
    return req.session.objectsAlreadyFetched;
}

function useFunCallsAlreadyFetched(req) {
    if (!req.session.funCallsAlreadyFetched) {
        req.session.funCallsAlreadyFetched = {};
    };
    return req.session.funCallsAlreadyFetched;
}

function expandSnapshot(snapshot, objectsAlreadyFetched, funCallsAlreadyFetched) {
    if (!snapshot) {
        return null;
    }
    const objectMap = {};
    const heapMap = {};
    
    const funCallMap = ensureFunCallsFetched(snapshot.fun_call_id, funCallsAlreadyFetched);
    let funCall = funCallMap[snapshot.fun_call_id];
    
    for (let funCall of Object.values(funCallMap)) {
        getObjectsDeep(
            new HeapRef(funCall.locals), 
            objectMap, 
            snapshot.heap,
            heapMap,
            objectsAlreadyFetched);
        if (funCall.globals) {
            getObjectsDeep(
                new HeapRef(funCall.globals), 
                objectMap, 
                snapshot.heap,
                heapMap,
                objectsAlreadyFetched);
        }
        if (funCall.closure_cellvars) {
            const cellvars = parse(funCall.closure_cellvars);
            for (let cellvar of cellvars.values()) {
                getObjectsDeep(
                    cellvar,
                    objectMap, 
                    snapshot.heap,
                    heapMap,
                    objectsAlreadyFetched);
            }
        }
        if (funCall.closure_freevars) {
            const freevars = parse(funCall.closure_freevars);
            for (let freevar of freevars.values()) {
                getObjectsDeep(
                    freevar,
                    objectMap, 
                    snapshot.heap,
                    heapMap,
                    objectsAlreadyFetched);
            }
        }
    }
    
    let error = getErrorBySnapshotId.get(snapshot.id);
    return {
        ...snapshot,
        funCallMap,
        objectMap,
        heapMap,
        error
    };
}

function ensureFunCallsFetched(funCallId, funCallsAlreadyFetched) {
    const funCallMap = {};
    while (true) {
        if (!funCallId || (funCallId in funCallsAlreadyFetched)) {
            break;
        }
        let funCall = getFunCallStatement.get(funCallId);
        funCallMap[funCall.id] = funCall;
        funCallsAlreadyFetched[funCall.id] = true;
        funCallId = funCall.parent_id;
    }
    return funCallMap;
}

function getObjectsDeep(ref, objectMap, heapVersion, heapMap, objectsAlreadyFetched) {
    let dbObject;
    let id;
    if (ref instanceof Ref) {
        id = ref.id;
        if (objectsAlreadyFetched[id]) {
            return;
        } else {
            dbObject = getObject(id);    
        }
    } else if (ref instanceof HeapRef) {
        if (ref.id in heapMap) {
            return;
        } else {
            // console.log("heap ref", ref.id, "heapVersion", heapVersion);
            const dbHeapRef = getHeapRef.get(ref.id, heapVersion);
            if (!dbHeapRef) {
                heapMap[ref.id] = null;
                // console.log("no dbHeapRef found");
                return;
            }
            // console.log("got dbHeapRef:", dbHeapRef);
            id = dbHeapRef.object_id;
            heapMap[ref.id] = id;
            dbObject = getObject(id);
        }
    } else {
        return;
    }
    objectMap[id] = dbObject.data;
    objectsAlreadyFetched[id] = true;
    const object = parse(dbObject.data, true);
    if (Array.isArray(object)) {
        for (let j = 0; j < object.length; j++) {
            let item = object[j];
            getObjectsDeep(item, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
        }
    } else if (object instanceof Map) {
        object.forEach((value, key) => {
            getObjectsDeep(key, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
            getObjectsDeep(value, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
        });
    }
}

function getObjectsDeep2(ref, objectMap, heapVersion, heapMap, objectsAlreadyFetched) {
    let dbObject;
    let id;
    if (ref instanceof Ref) {
        id = ref.id;
        if (objectsAlreadyFetched[id]) {
            return;
        } else {
            dbObject = getObject(id);    
        }
    } else if (ref instanceof HeapRef) {
        if (ref.id in heapMap) {
            return;
        } else {
            const dbHeapRef = getHeapRef.get(ref.id, heapVersion);
            if (!dbHeapRef) {
                heapMap[heapVersion + "/" + ref.id] = null;
                // console.log("no dbHeapRef found");
                return;
            }
            // console.log("got dbHeapRef:", dbHeapRef);
            id = dbHeapRef.object_id;
            heapMap[heapVersion + "/" + ref.id] = id;
            if (objectsAlreadyFetched[id]) {
                return;
            } else {
                dbObject = getObject(id);    
            }
        }
    } else {
        return;
    }
    objectMap[id] = dbObject.data;
    objectsAlreadyFetched[id] = true;
    const object = parse(dbObject.data, true);
    if (Array.isArray(object)) {
        for (let j = 0; j < object.length; j++) {
            let item = object[j];
            getObjectsDeep2(item, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
        }
    } else if (object instanceof Map) {
        object.forEach((value, key) => {
            getObjectsDeep2(key, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
            getObjectsDeep2(value, objectMap, heapVersion, heapMap, objectsAlreadyFetched);
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

app.listen(port, () => {
    console.log(`Listening on ${port}`);
});