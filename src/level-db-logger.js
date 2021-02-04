/*
Level DB Logger implementation
*/
class $LevelDBLogger {
    constructor() {
        this.pendingNewObjects = [];
        this.pendingFunCalls = [];
        this.pendingSnapshots = [];
    }
    openDB() {
        return new Promise((accept, reject) => {
            this.db.open((error) => {
                if (error) {
                    reject(error);
                } else {
                    accept();
                }
            });
        });
    }
    put(key, value) {
        return new Promise((accept, reject) => {
            this.db.put(key, value, (err) => {
                if (err) {
                    reject(err);
                    return;
                } else {
                    accept();
                }
            });
        });
    }
    async initialize() {
        const leveldown = require('leveldown');
        const charwise = require('charwise');
        this.charwise = charwise;
        this.db = leveldown(HISTORY_FILE_PATH, {
            keyEncoding: charwise
        });
        await this.openDB();
        await this.put("sourcecode", JSON.stringify({ file_path: SOURCE_FILE_PATH, source: $code }));
    }
    logNewObject(object) {
        const id = $nextObjectId++;
        $objectToIdMap.set(object, id);
        this.pendingNewObjects.push(object);
    }
    logFunCall(funName, parameters, parentId) {
        const id = $nextFunCallId++;
        this.pendingFunCalls.push({
            id, funName, parameters, parentId
        });
        return id;
    }
    logSnapshot(line) {
        const id = $nextSnapshotId++;
        const funCall = $stack ? $stack.funCall : null;
        const snapshot = [
            id, 
            funCall, 
            $getObjectId($stack), 
            $getObjectId($heap), 
            $interops && $interops.length && $getObjectId($interops),
            line
        ];
        this.pendingSnapshots.push(snapshot);
        if (id % 100 === 0) {
            this.flush();
        }
    }
    logError(err) {
        throw new Error("Unimplemented");
    }
    flush() {
        const charwise = this.charwise;
        const batch = this.db.batch();
        for (let newObject of this.pendingNewObjects) {
            const id = $objectToIdMap.get(newObject);
            batch.put(charwise.encode(["object", id]), $stringify(newObject));
        }
        this.pendingNewObjects = [];
        for (let call of this.pendingFunCalls) {
            batch.put(charwise.encode(["funcall", call.id]), `${call.funName}, ${$getObjectId(call.parameters)}, ${call.parentId}`);
            batch.put(charwise.encode(["funcall", "parentId", call.parentId, call.id]), call.id);
        }
        this.pendingFunCalls = [];
        for (let snapshot of this.pendingSnapshots) {
            let [id, funCall, stack, heap, interops, line] = snapshot;
            batch.put(charwise.encode(["snapshot", id]), `${funCall}, ${stack}, ${heap}, ${interops}, ${line}`);
            batch.put(charwise.encode(["snapshot", "funcall", funCall, id]), id);
        }
        this.pendingSnapshots = [];
        batch.write(() => undefined);
    }
    close() {
        this.db.close(() => undefined);
    }
}
/*
Level DB Logger implementation ends
*/