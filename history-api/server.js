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

const filename = "../ex/tic-tac-toe-speed-test.history";
const db = sqlite3(filename);
const getFunCallStatement = db.prepare("select * from FunCall where id is ?");
const getFunCallByParentStatement = db.prepare("select * from FunCall where parent_id is ?");
const getSnapshotsByFunCall = db.prepare("select * from Snapshot where fun_call_id = ?");
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
    if (!req.session.objectsAlreadyFetched) {
        req.session.objectsAlreadyFetched = {};
    };
    const objectsAlreadyFetched = req.session.objectsAlreadyFetched;
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