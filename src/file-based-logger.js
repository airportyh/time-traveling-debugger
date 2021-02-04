/*
File-based Logger Implementation
*/
class $FileLogger {
    constructor() {
        this.stream = null;
    }
    async initialize() {
        this.stream = fs.createWriteStream(HISTORY_FILE_PATH);
    }
    logNewObject(object) {
        const id = $nextObjectId++;
        $objectToIdMap.set(object, id);
        this.stream.write(`object(${id}): ${$stringify(object)}\n`);
    }
    logFunCall(funName, parameters, parentId) {
        const id = $nextFunCallId++;
        this.stream.write(`funcall(${id}, ${funName}, ${$getObjectId(parameters)}, ${parentId})\n`);
        return id;
    }
    logSnapshot(line) {
        const id = $nextSnapshotId++;
        const funCall = $stack ? $stack.funCall : null;
        const stack = $getObjectId($stack);
        const heap = $getObjectId($heap);
        const interops = $interops && $interops.length && $getObjectId($interops);
        this.stream.write(`snapshot(${id}, ${funCall}, ${stack}, ${heap}, ${interops}, ${line})\n`);
    }
    logError(err) {
        throw new Error("Unimplemented");
    }
    flush() {
        this.stream.end();
    }
    close() {}
}
/*
File-based Logger Implementation ends
*/