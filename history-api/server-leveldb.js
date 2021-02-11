/*
The history API for level DB was 80%, but unfinished.
*/

const express = require("express");
const cors = require('cors');
const session = require('express-session');
const charwise = require('charwise');
const leveldown = require('leveldown');
const { parse, Ref, stringify } = require("@airportyh/jsonr");

const app = express();
const port = 3000;
app.use(cors());
app.use(session({
    secret: 'ABCDEFG'
}));

const filename = "ex/tic-tac-toe-speed-test.history.leveldb";
const db = leveldown(filename, {
    keyEncoding: charwise
});

app.get("/api/FunCall", async (req, res) => {
    const parentId = req.query.parentId || null;
    const funCalls = await getFunCallsByParentId(parentId);
    res.json(funCalls);
});

app.get("/api/Snapshot", async (req, res) => {
    const funCallId = req.query.funCallId;
    if (!funCallId) {
        res.json({ error: `No Fun Call ID given` });
        return;
    }
    const snapshots = await getSnapshotsByFunCall(db, funCallId);
    res.json(snapshots);
});

app.get("/api/SourceCode", async (req, res) => {
    const result = JSON.parse((await get(db, "sourcecode")).toString());
    res.json(result);
});

app.get("/api/FunCallExpanded", async (req, res) => {
    if (!req.session.objectsAlreadyFetched) {
        req.session.objectsAlreadyFetched = {};
    };
    const objectsAlreadyFetched = req.session.objectsAlreadyFetched;
    const id = req.query.id;
    // 1. get fun call via id
    const funCall = await getFunCall(db, id);
    // 2. get child fun calls by parent id
    const childFunCalls = await getFunCallsByParentId(db, id);
    // 3. get snapshots by fun call id
    const snapshots = await getSnapshotsByFunCall(db, id);
    const objectMap = {};
    /*for (let i = 0; i < snapshots.length; i++) {
        const snapshot = snapshots[i];
        getObjectsDeep(snapshot.stack, objectMap, objectsAlreadyFetched);
        getObjectsDeep(snapshot.heap, objectMap, objectsAlreadyFetched);
    }*/
    const retval = {
        ...funCall,
        childFunCalls,
        snapshots,
        objectMap
    };
    res.json(retval);
});

app.get("/api/test", async (req, res) => {
    const calls = await getFunCallsByParentId(db, 1);
    res.json(calls);
});

async function getFunCall(db, id) {
    const funCallValue = await get(db, ['funcall', id]);
    let [funCall, parameters, parentId] = funCallValue.toString().split(", ");
    return {
        id,
        fun_call: funCall,
        parameters: Number(parameters),
        parent_id: JSON.parse(parentId)
    };
}

async function getFunCallsByParentId(db, parentId) {
    let iteratorOptions;
    if (parentId) {
        iteratorOptions = {
            gte: charwise.encode(['funcall', 'parentId', parentId, 0]),
            lt: charwise.encode(['funcall', 'parentId', parentId, 100])
        };
    } else {
        iteratorOptions = {
            gte: charwise.encode(['funcall', 'parentId', null]),
            lte: charwise.encode(['funcall', 'parentId', 1])
        };
    }
    const funCallIds = await getAll(db, iteratorOptions);
    let funCalls = [];
    for (let funCallId of funCallIds) {
        const funCall = await getFunCall(db, funCallId);
        funCalls.push(funCall);
    }
    return funCalls;
}

async function getSnapshotsByFunCall(db, funCallId) {
    const snapshotIds = await getAll(db, {
        gte: ['snapshot', 'funcall', funCallId],
        lt: ['snapshot', 'funcall', funCallId + 1],
    });
    let snapshots = [];
    for (let snapshotId of snapshotIds) {
        const snapshotValue = await get(db, ['snapshot', snapshotId]);
        const [fun_call_id, stack, heap, interop, line_no] = snapshotValue.toString().split(", ");
        snapshots.push({
            id: Number(snapshotId),
            fun_call_id: Number(fun_call_id),
            stack: Number(stack),
            heap: Number(heap),
            interop: Number(interop),
            line_no: Number(line_no)
        });
    }
    return snapshots;
}

db.open((err) => {
    if (err) {
        console.log("Error opening database: " + err.message);
        return;
    }
    app.listen(port, () => {
        console.log(`Listening on ${port}`);
    });
});

function get(db, key) {
    return new Promise((accept, reject) => {
        db.get(key, (err, value) => {
            if (err) {
                reject(err);
                return;
            }
            accept(value);
        });
    });
}

function getAll(db, iteratorOptions) {
    return new Promise((accept, reject) => {
        const it = db.iterator(iteratorOptions);
        const results = [];
        next();
        
        function next() {
            it.next((err, key, value) => {
                if (err) {
                    reject(err);
                    return;
                } else {
                    if (key) {
                        results.push(value.toString());
                        next();
                    } else {
                        it.end(() => {});
                        accept(results);
                    }
                }
            });
        }
    });
}