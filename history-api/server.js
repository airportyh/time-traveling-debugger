const express = require("express");
const cors = require('cors');
const sqlite3 = require("better-sqlite3");
const app = express();
const port = 3000;
app.use(cors());

const filename = "../ex/tic-tac-toe-term.history";
const db = sqlite3(filename);
const getFunCallStatement = db.prepare("select * from FunCall where parent_id is ?");
const getSnapshotsByFunCall = db.prepare("select * from Snapshot where fun_call_id = ?");

app.get("/api/FunCall", (req, res) => {
    const parentId = req.query.parentId || null;
    const result = getFunCallStatement.all(parentId);
    res.json(result);
});

app.get("/api/Snapshot", (req, res) => {
    const funCallId = req.query.funCallId || null;
    const result = getSnapshotsByFunCall.all(funCallId);
    res.json(result);
});

app.get("/api/Object", (req, res) => {
    const ids = req.query.id;
    if (!ids) {
        res.json([]);
    } else {
        const binds = Array(ids.length).join("?, ") + "?";
        const statement = "select * from Object where id in (" + binds + ")";
        const result = db.prepare(statement).all(...ids);
        res.json(result);
    }
});

app.get("/api/SourceCode", (req, res) => {
    const result = db.prepare("select * from SourceCode").get();
    res.json(result);
});

app.listen(port, () => {
    console.log(`Listening on ${port}`);
});