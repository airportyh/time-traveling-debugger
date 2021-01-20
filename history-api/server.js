const express = require("express");
const cors = require('cors');
const sqlite3 = require("better-sqlite3");
const session = require('express-session');
const { parse, Ref, HeapRef } = require("../json-like/json-like-parser");

// const filename = "ex/tic-tac-toe-speed-test.history";
// const filename = "/Users/airportyh/Home/OpenSource/cpython/rewind.sqlite";
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
const getSnapshotWithError = db.prepare("select * from Snapshot where error_id is not null");
const getNextSnapshotWithFunCallId = db.prepare("select * from Snapshot where id > ? and fun_call_id = ? limit 1");
const getPrevSnapshotWithFunCallId = db.prepare("select * from Snapshot where id < ? and fun_call_id = ? order by id desc limit 1");
const getObjectStatement = db.prepare("select * from Object where id = ?");
const getErrorStatement = db.prepare("select * from Error where id = ?");

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

app.get("/api/SourceCode", (req, res) => {
    const result = db.prepare("select * from SourceCode").get();
    res.json(result);
});

app.get("/api/FunCallExpanded", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const id = req.query.id;
    const funCall = getFunCallStatement.get(id);
    const childFunCalls = getFunCallByParentStatement.all(id);
    const snapshots = getSnapshotsByFunCall.all(id);
    const objectMap = {};
    for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        getObjectsDeep(snapshot.stack, objectMap, objectsAlreadyFetched);
        getObjectsDeep(snapshot.heap, objectMap, objectsAlreadyFetched);
    }
    const retval = {
        ...funCall,
        childFunCalls,
        snapshots,
        objectMap
    };
    res.json(retval);
});

app.get("/api/SnapshotExpanded", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = req.query.id;
    const snapshot = getSnapshotById.get(id);
    if (!snapshot) {
        res.json(null);
        return;
    }
    const snapshotExpanded = expandSnapshot(snapshot, objectsAlreadyFetched, funCallsAlreadyFetched);
    res.json(snapshotExpanded);
});

app.get("/api/SnapshotWithError", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const snapshot = getSnapshotWithError.get();
    if (!snapshot) {
        res.json(null);
        return;
    }
    const snapshotExpanded = expandSnapshot(snapshot, objectsAlreadyFetched, funCallsAlreadyFetched);
    res.json(snapshotExpanded);
});

app.get("/api/StepOver", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const nextSnapshot = getSnapshotById.get(id + 1);
    if (!nextSnapshot) {
        res.json(null);
        return;
    }
    const nextSnapshotFunCall = getFunCallStatement.get(nextSnapshot.fun_call_id);
    if (nextSnapshotFunCall.parent_id === snapshot.fun_call_id) {
        let snapshotAfterCall = getNextSnapshotWithFunCallId.get(id, snapshot.fun_call_id);
        if (snapshotAfterCall && snapshotAfterCall.line_no === snapshot.line_no) {
            snapshotAfterCall = getSnapshotById.get(snapshotAfterCall.id + 1);
        }
        if (snapshotAfterCall) {
            res.json(expandSnapshot(snapshotAfterCall, objectsAlreadyFetched, funCallsAlreadyFetched));
        } else {
            res.json(null);
        }
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
    }
});

app.get("/api/StepOverBackward", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const prevSnapshot = getSnapshotById.get(id - 1);
    if (!prevSnapshot) {
        res.json(null);
        return;
    }
    const prevSnapshotFunCall = getFunCallStatement.get(prevSnapshot.fun_call_id);
    if (prevSnapshotFunCall.parent_id === snapshot.fun_call_id) {
        let snapshotBeforeCall = getPrevSnapshotWithFunCallId.get(prevSnapshot.id, snapshot.fun_call_id);
        if (snapshotBeforeCall && snapshotBeforeCall.line_no === snapshot.line_no) {
            snapshotBeforeCall = getSnapshotById.get(snapshotBeforeCall.id - 1);
        }
        if (snapshotBeforeCall) {
            res.json(expandSnapshot(snapshotBeforeCall, objectsAlreadyFetched, funCallsAlreadyFetched));
        } else {
            res.json(null);
        }
    } else {
        const prevPrevSnapshot = getSnapshotById.get(id - 2);
        if (prevPrevSnapshot) {
            const prevPrevSnapshotFunCall = getFunCallStatement.get(prevPrevSnapshot.fun_call_id);
            if (prevPrevSnapshotFunCall.parent_id === prevSnapshot.fun_call_id) {
                let snapshotBeforeCall = getPrevSnapshotWithFunCallId.get(prevPrevSnapshot.id, prevSnapshot.fun_call_id);
                if (snapshotBeforeCall.line_no === snapshot.line_no) {
                    snapshotBeforeCall = getSnapshotById.get(snapshotBeforeCall.id - 1);
                }
                if (snapshotBeforeCall) {
                    res.json(expandSnapshot(snapshotBeforeCall, objectsAlreadyFetched, funCallsAlreadyFetched));
                    return;
                } else {
                    res.json(null);
                    return;
                }
            }
        }
        res.json(expandSnapshot(prevSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
    }
});

app.get("/api/StepOut", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getNextSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    if (!nextSnapshot) {
        res.json(null);
        return;
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
    }
});

app.get("/api/StepOutBackward", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const funCallsAlreadyFetched = useFunCallsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getPrevSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    if (!nextSnapshot) {
        res.json(null);
        return;
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched, funCallsAlreadyFetched));
    }
});

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
    const objectMap = {};
    getObjectsDeep(snapshot.stack, objectMap, objectsAlreadyFetched);
    getObjectsDeep(snapshot.heap, objectMap, objectsAlreadyFetched);
    const funCallMap = ensureFunCallsFetched(
        snapshot, objectMap, funCallsAlreadyFetched);
    let funCall = funCallMap[snapshot.fun_call_id];
    if (!funCall) {
        funCall = getFunCallStatement.get(snapshot.fun_call_id);
    }
    getObjectsDeep(funCall.parameters, objectMap, objectsAlreadyFetched);
    let error = null;
    if (snapshot.error_id) {
        error = getErrorStatement.get(snapshot.error_id);
    }
    return {
        ...snapshot,
        funCallMap,
        objectMap,
        error
    };
}

function ensureFunCallsFetched(snapshot, objectMap, funCallsAlreadyFetched) {
    const funCallMap = {};
    if (snapshot.stack in objectMap) {
        let stack = parse(objectMap[snapshot.stack], true);
        while (true) {
            if (!stack) {
                break;
            }
            // console.log("stack", stack);
            const frame = parse(objectMap[String(stack[0].id)], true);
            // console.log("frame", frame, objectMap[String(stack[0].id)]);
            if (!(frame.get("funCall") in funCallsAlreadyFetched)) {
                const funCall = getFunCallStatement.get(frame.get("funCall"));
                funCallMap[funCall.id] = funCall;
                funCallsAlreadyFetched[frame.funCall] = true;
            }
            if (stack[1]) {
                const objectData = objectMap[String(stack[1].id)];
                stack = parse(objectData, true);
            } else {
                stack = null;
            }
        }
    }
    return funCallMap;
}

function getObjectsDeep(id, objectMap, objectsAlreadyFetched) {
    if (objectsAlreadyFetched[id]) {
        return;
    }
    const dbObject = getObject(id);

    objectMap[id] = dbObject.data;
    objectsAlreadyFetched[id] = true;
    // console.log("data", id, dbObject.data);
    const object = parse(dbObject.data, true);
    if (Array.isArray(object)) {
        for (let j = 0; j < object.length; j++) {
            let item = object[j];
            if (item instanceof Ref) {
                getObjectsDeep(item.id, objectMap, objectsAlreadyFetched);
            }
        }
    } else if (object instanceof Map) {
        // it's a map
        object.forEach((value, key) => {
            if (value instanceof Ref) {
                getObjectsDeep(value.id, objectMap, objectsAlreadyFetched);
            }
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