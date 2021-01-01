const express = require("express");
const cors = require('cors');
const sqlite3 = require("better-sqlite3");
const session = require('express-session');
const { parse, Ref, stringify } = require("@airportyh/jsonr");

const app = express();
const port = 3000;
app.use(cors());
app.use(session({
    secret: 'ABCDEFG'
}));

const filename = "ex/tic-tac-toe-speed-test.history";
// const filename = "/Users/airportyh/Home/OpenSource/cpython/rewind.sqlite";
const db = sqlite3(filename);
const getFunCallStatement = db.prepare("select * from FunCall where id is ?");
const getFunCallByParentStatement = db.prepare("select * from FunCall where parent_id is ?");
const getSnapshotsByFunCall = db.prepare("select * from Snapshot where fun_call_id = ?");
const getSnapshotById = db.prepare("select * from Snapshot where id = ?");
const getNextSnapshotWithFunCallId = db.prepare("select * from Snapshot where id > ? and fun_call_id = ? limit 1");
const getPrevSnapshotWithFunCallId = db.prepare("select * from Snapshot where id < ? and fun_call_id = ? order by id desc limit 1");
const getObjectStatement = db.prepare("select * from Object where id = ?");

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
    const id = req.query.id;
    const snapshot = getSnapshotById.get(id);
    if (!snapshot) {
        res.json(null);
        return;
    }
    const snapshotExpanded = expandSnapshot(snapshot, objectsAlreadyFetched);
    res.json(snapshotExpanded);
});

app.get("/api/StepOver", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
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
        if (snapshotAfterCall.line_no === snapshot.line_no) {
            snapshotAfterCall = getSnapshotById.get(snapshotAfterCall.id + 1);
        }
        if (snapshotAfterCall) {
            res.json(expandSnapshot(snapshotAfterCall, objectsAlreadyFetched));
        } else {
            res.json(null);
        }
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched));
    }
});

app.get("/api/StepOverBackward", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const prevSnapshot = getSnapshotById.get(id - 1);
    if (!prevSnapshot) {
        res.json(null);
        return;
    }
    const prevSnapshotFunCall = getFunCallStatement.get(prevSnapshot.fun_call_id);
    if (prevSnapshotFunCall.parent_id === snapshot.fun_call_id) {
        console.log("doing getPrevSnapshotWithFunCallId query", prevSnapshot.id, snapshot.fun_call_id);
        let snapshotBeforeCall = getPrevSnapshotWithFunCallId.get(prevSnapshot.id, snapshot.fun_call_id);
        if (snapshotBeforeCall.line_no === snapshot.line_no) {
            snapshotBeforeCall = getSnapshotById.get(snapshotBeforeCall.id - 1);
        }
        if (snapshotBeforeCall) {
            res.json(expandSnapshot(snapshotBeforeCall, objectsAlreadyFetched));
        } else {
            res.json(null);
        }
    } else {
        res.json(expandSnapshot(prevSnapshot, objectsAlreadyFetched));
    }
});

app.get("/api/StepOut", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getNextSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    if (!nextSnapshot) {
        res.json(null);
        return;
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched));
    }
});

app.get("/api/StepOutBackward", (req, res) => {
    const objectsAlreadyFetched = useObjectsAlreadyFetched(req);
    const id = Number(req.query.id);
    const snapshot = getSnapshotById.get(id);
    const snapshotFunCall = getFunCallStatement.get(snapshot.fun_call_id);
    const nextSnapshot = getPrevSnapshotWithFunCallId.get(snapshot.id, snapshotFunCall.parent_id);
    if (!nextSnapshot) {
        res.json(null);
        return;
    } else {
        res.json(expandSnapshot(nextSnapshot, objectsAlreadyFetched));
    }
});

function useObjectsAlreadyFetched(req) {
    if (!req.session.objectsAlreadyFetched) {
        req.session.objectsAlreadyFetched = {};
    };
    return req.session.objectsAlreadyFetched;
}

function expandSnapshot(snapshot, objectsAlreadyFetched) {
    const objectMap = {};
    const funCall = getFunCallStatement.get(snapshot.fun_call_id);
    getObjectsDeep(funCall.parameters, objectMap, objectsAlreadyFetched);
    getObjectsDeep(snapshot.stack, objectMap, objectsAlreadyFetched);
    getObjectsDeep(snapshot.heap, objectMap, objectsAlreadyFetched);
    return {
        ...snapshot,
        funCall,
        objectMap
    };
}

function getObjectsDeep(id, objectMap, objectsAlreadyFetched) {
    if (objectsAlreadyFetched[id]) {
        return;
    }
    const dbObject = getObject(id);
    objectMap[id] = dbObject.data;
    objectsAlreadyFetched[id] = true;
    const object = parse(dbObject.data, true);
    if (Array.isArray(object)) {
        const resultArray = [];
        for (let j = 0; j < object.length; j++) {
            let item = object[j];
            if (item instanceof Ref) {
                item = getObjectsDeep(item.id, objectMap, objectsAlreadyFetched);
            }
            resultArray.push(item);
        }
        return resultArray;
    } else {
        const resultObject = {};
        for (let key in object) {
            let value = object[key];
            if (value instanceof Ref) {
                value = getObjectsDeep(value.id, objectMap, objectsAlreadyFetched);
            }
            resultObject[key] = value;
        }
        return resultObject;
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