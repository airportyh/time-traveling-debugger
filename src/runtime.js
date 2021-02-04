// Runtime functions
// HISTORY_FILE_PATH should be predefined by the emitted code
// Inspector used for profiler

const inspector = require("inspector");
const $inspectorSession = new inspector.Session();
const readline = require('readline');
const fs = require('fs');

class $HeapRef {
    constructor(id) {
        this.id = id;
    }
}

class $NullLogger {
    initialize() {}
    logNewObject(object) {}
    logFunCall(call) {}
    logSnapshot(line) {}
    logHeapUpdate(heapId, object) {}
    flush() {}
    close() {}
}

class $SQLiteDBLogger {
    async initialize() {
        try { fs.unlinkSync(HISTORY_FILE_PATH); } catch (e) {}
        const sqlite3 = require('better-sqlite3');
        this.db = sqlite3(HISTORY_FILE_PATH);
        this.db.exec("PRAGMA journal_mode=WAL");
        //this.db.exec("PRAGMA cache_size=10000");
        this.db.exec("PRAGMA synchronous = OFF");
        
        const schema = `
        create table Snapshot (
            id integer primary key,
            fun_call_id integer,
            heap integer,
            line_no integer,
            constraint Snapshot_fk_fun_call_id foreign key (fun_call_id)
                references FunCall(id)
        );

        create table Object (
            id integer primary key,
            data text  -- JSON-like format
        );

        create table FunCall (
            id integer primary key,
            fun_name text,
            locals integer, -- heap ID
            globals integer, -- heap ID
            closure_cellvars text, -- json-like object
            closure_freevars text, -- json-like object
            parent_id integer,
            code_file_id integer,
            
            constraint FunCall_fk_parent_id foreign key (parent_id)
                references FunCall(id)
            constraint FunCall_fk_code_file_id foreign key (code_file_id)
                references CodeFile(id)
        );
        
        create table CodeFile (
            id integer primary key,
            file_path text,
            source text
        );
        
        create table HeapRef (
            id integer,
            heap_version integer,
            object_id integer,

            constraint HeapRef_pk PRIMARY KEY (id, heap_version)
            constraint HeapRef_fk_object_id foreign key (object_id)
                references Object(id)
        );
        
        create table Error (
            id integer primary key,
            type text,
            message text,
            snapshot_id integer,

            constraint Error_fk_snapshot_id foreign key (snapshot_id)
                references Snapshot(id)
        );
        `;
        this.db.exec(schema);

        this.insertObjectStatement = this.db.prepare(`insert into Object values (?, ?)`);
        this.insertFunCallStatement = this.db.prepare(`insert into FunCall values (?, ?, ?, ?, ?, ?, ?, ?)`);
        this.insertSnapshotStatement = this.db.prepare(`insert into Snapshot values (?, ?, ?, ?)`);
        this.insertHeapRefStatement = this.db.prepare(`insert into HeapRef values (?, ?, ?)`);
        this.insertErrorStatement = this.db.prepare(`insert into Error values (?, ?, ?, ?)`);
        this.db
            .prepare(`insert into CodeFile values (1, ?, ?)`)
            .run(SOURCE_FILE_PATH, $code);

        this.pendingNewObjects = [];
        this.pendingFunCalls = [];
        this.pendingSnapshots = [];
        this.pendingHeapUpdates = [];
    }
    logNewObject(object) {
        const id = $nextObjectId++;
        $objectToIdMap.set(object, id);
        this.pendingNewObjects.push(object);
        return object;
    }
    serializeClosureCellVars(cellvars) {
        let parts = [];
        for (let varname in cellvars) {
            parts.push('"' + varname + '": ^' + cellvars[varname].id);
        }
        return "{" + parts.join(", ") + "}";
    }
    serializeClosureFreeVars(freevarsArr) {
        let parts = [];
        for (let freevars of freevarsArr) {
            for (let varname in freevars) {
                parts.push('"' + varname + '": ^' + freevars[varname].id);
            }
        }
        return "{" + parts.join(", ") + "}";
    }
    logFunCall(funCall) {
        const id = $nextFunCallId++;
        this.pendingFunCalls.push([
            funCall.id, 
            funCall.funName, 
            funCall.locals.id,
            null,
            this.serializeClosureCellVars(funCall.closureCellVars),
            this.serializeClosureFreeVars(funCall.closureFreeVars),
            funCall.parent && funCall.parent.id || null,
            1
        ]);
        return id;
    }
    logSnapshot(line) {
        const id = $nextSnapshotId++;
        const funCallId = $stack ? $stack.id : null;
        this.pendingSnapshots.push([
            id, 
            funCallId, 
            $heapVersion, 
            line
        ]);
        if (id % 500 === 0) {
            this.flush();
        }
    }
    logHeapUpdate(heapId, object) {
        $heapVersion++;
        this.pendingHeapUpdates.push([heapId, $heapVersion, $getObjectId(object)]);
    }
    logError(err) {
        this.flush();
        const id = $nextSnapshotId++;
        const errorId = $nextErrorId++;
        const funCallId = $stack ? $stack.id : null;

        this.insertSnapshotStatement.run(id, funCallId, $heapVersion, err.line);
        this.insertErrorStatement.run(errorId, 'Error', err.message, id);
    }
    flush() {
        this.db.exec("begin transaction");
        for (let newObject of this.pendingNewObjects) {
            const id = $objectToIdMap.get(newObject);
            this.insertObjectStatement.run(id, $stringify(newObject));
        }
        this.pendingNewObjects = [];
        for (let call of this.pendingFunCalls) {
            this.insertFunCallStatement.run(...call);
        }
        this.pendingFunCalls = [];
        for (let snapshot of this.pendingSnapshots) {
            this.insertSnapshotStatement.run(...snapshot);
        }
        this.pendingSnapshots = [];
        for (let heapUpdate of this.pendingHeapUpdates) {
            this.insertHeapRefStatement.run(...heapUpdate);
        }
        this.pendingHeapUpdates = [];
        this.db.exec("end transaction");
    }
    close() {}
}

const $isBrowser = typeof document !== "undefined";
const $objectToIdMap = new WeakMap();
const $logger = new $SQLiteDBLogger();
let $stack = null;
let $lastLine = null;

// DB logger variables
let $nextObjectId = 1;
let $nextHeapId = 1;
let $nextFunCallId = 1;
let $nextSnapshotId = 1;
let $nextErrorId = 1;
// DB logger variables end

const $emptyObject = {};
let $heap = $emptyObject;
let $heapVersion = 1;

// ARC variables
let $heapRefCount = {}; // not using $emptyObject here because we will mutate it
let $pendingRetVal = null;
// ARC variables end

let $interops = [];
let $errorMessage = null;
const $emptyArray = [];

async function $initialize() {
    $inspectorSession.connect();
    await $logger.initialize();
}

function $getObjectId(object) {
    const id = $objectToIdMap.get(object);
    if (!id) {
        console.trace("Object does not have a registered ID", object);
        throw new Error("Object does not have a registered ID");
    }
    return id;
}

function $stringify(object) {
    if (Array.isArray(object)) {
        let arrayString = "[";
        for (let i = 0; i < object.length; i++) {
            if (i > 0) {
                arrayString += ", ";
            }
            let value = object[i];
            if (value === true) {
                arrayString += "true";
            } else if (value === false) {
                arrayString += "false";
            } else if (value == null) {
                arrayString += 'null';
            } else if (typeof value === "string") {
                arrayString += '"' + value + '"';
            } else if (typeof value === "number") {
                arrayString += value;
            } else if ($isHeapRef(value)) {
                arrayString += `^${value.id}`;
            } else {
                arrayString += "*" + $getObjectId(value);
            }
        }
        arrayString += "]";
        return arrayString;
    } else if (typeof object === "object") {
        let objectString = "{";
        let first = true;
        for (let key in object) {
            if (!first) {
                objectString += ", ";    
            } else {
                first = false;
            }
            objectString += '"' + key + '": ';
            let value = object[key];
            if (value === true) {
                objectString += "true";
            } else if (value === false) {
                objectString += "false";
            } else if (value == null) {
                objectString += 'null';
            } else if (typeof value === "string") {
                objectString += '"' + value + '"';
            } else if (typeof value === "number") {
                objectString += value;
            } else if ($isHeapRef(value)) {
                objectString += `^${value.id}`;
            } else {
                objectString += "*" + $getObjectId(value);
            }
        }
        objectString += "}";
        return objectString;
    } else {
        throw new Error("Cannot stringify non-object");
    }
}

function $pushFrame(funName, variablesRef, closureCellVars, closureFreeVars) {
    variables = $heapAccess(variablesRef);
    for (let varName in variables) {
        const varValue = variables[varName];
        if ($isHeapRef(varValue)) {
            $incRefCount(varValue);
        }
    }
    $stack = {
        funName,
        locals: variablesRef,
        parent: $stack,
        closureCellVars,
        closureFreeVars
    };
    const id = $logger.logFunCall($stack);
    $stack.id = id;
    // TODO: closures
    // if (closures) {
    //     $stack.closures = closures;
    // }
}

function $popFrame() {
    const variables = $heapAccess($stack.locals);
    for (let varName in variables) {
        let varValue = variables[varName];
        if ($isHeapRef(varValue)) {
            $decRefCount(varValue);
            if ($heapRefCount[varValue.id] <= 0) {
                if (varName === "<ret val>") {
                    if ($pendingRetVal && $pendingRetVal.id !== varValue.id && 
                        $pendingRetVal.id in $heap) {
                        if ($heapRefCount[$pendingRetVal.id] <= 0) {
                            $removeFromHeap($pendingRetVal);
                        }
                    }
                    $pendingRetVal = varValue;
                } else {
                    $removeFromHeap(varValue);
                }
            }
        }
    }
    $stack = $stack.parent;
}

function $removeFromHeap(heapRef) {
    const object = $heap[heapRef.id];
    delete $heap[heapRef.id];
    delete $heapRefCount[heapRef.id];
    // for either arrays or objects
    for (let key in object) {
        const value = object[key];
        if ($isHeapRef(value)) {
            $decRefCountAndCleanup(value);
        }
    }
}

function $getVariable(varName) {
    const variables = $heapAccess($stack.locals);
    if (varName in variables) {
        return variables[varName];
    } else {
        $errorMessage = `Reference to undefined variable ${varName} encountered.`;
        throw new Error($errorMessage);
    }
}

function $setVariable(varName, value) {
    const variables = $heapAccess($stack.locals);
    const oldValue = variables[varName];
    const newVariables = { ...variables, [varName]: value };
    $logger.logNewObject(newVariables);
    $heapUpdate($stack.locals.id, newVariables);
    if (value !== oldValue) {
        if ($isHeapRef(value)) {
            $incRefCount(value);
        }
        if ($isHeapRef(oldValue)) {
            $decRefCountAndCleanup(oldValue);
        }
    }
}

function $incRefCount(heapRef) {
    let refCount = $heapRefCount[heapRef.id] || 0;
    $heapRefCount[heapRef.id] = refCount + 1;
}

function $decRefCount(heapRef) {
    $heapRefCount[heapRef.id]--;
}

function $decRefCountAndCleanup(heapRef) {
    $decRefCount(heapRef);
    if ($heapRefCount[heapRef.id] <= 0) {
        $removeFromHeap(heapRef);
    }
}

function $getClosureVariable(varName, closure) {
    const cellRef = closure[varName];
    return $heapAccess(cellRef).ob_ref;
}

function $setClosureVariable(varName, value, closure) {
    const cellRef = closure[varName];
    const cell = $heapAccess(cellRef);
    const newCell = {
        ...cell,
        ob_ref: value
    };
    $logger.logNewObject(newCell);
    $heapUpdate(cellRef.id, newCell);
}

function $isHeapRef(thing) {
    return thing instanceof $HeapRef;
}

function $heapAllocate(value) {
    $logger.logNewObject(value);
    const heapId = $nextHeapId;
    $nextHeapId++;
    $heapUpdate(heapId, value);
    // For either an array or object
    for (let key in value) {
        let entryValue = value[key];
        if ($isHeapRef(entryValue)) {
            $incRefCount(entryValue);
        }
    }
    return new $HeapRef(heapId);
}

function $heapUpdate(heapId, newObject) {
    $heap[heapId] = newObject;
    $logger.logHeapUpdate(heapId, newObject);
}

function $save(line) {
    $logger.logSnapshot(line);
    $interops = $emptyArray;
    $lastLine = line;
}

function $saveError(err) {
    if (err.saved) {
        return;
    }
    $logger.logError(err);
    err.saved = true;
}

function $heapAccess(thing) {
    if ($isHeapRef(thing)) {
        return $heap[thing.id];
    } else {
        return thing;
    }
}

function $get(thing, index) {
    return $heapAccess(thing)[index];
}

function $set(thing, index, value) {
    let object;
    let newObject;
    if ($isHeapRef(thing)) {
        object = $heap[thing.id];
    } else {
        // TODO: Do we really handle this??
        object = thing;
    }
    const oldValue = object[index];
    if (Array.isArray(object)) {
        newObject = object.slice();
        newObject[index] = value;
    } else {
        newObject = {
            ...object,
            [index]: value
        };
    }
    if ($isHeapRef(value)) {
        $incRefCount(value);
    }
    if ($isHeapRef(oldValue)) {
        $decRefCountAndCleanup(oldValue);
    }
    if ($isHeapRef(thing)) {
        $logger.logNewObject(newObject);
        $heapUpdate(thing.id, newObject);
    }
}

async function $cleanUp() {
    $logger.flush();
    $logger.close();
    const { profile } = await $stopProfiler();
    fs.writeFileSync(PROFILE_JSON_PATH, JSON.stringify(profile));
}

function $startProfiler() {
    return new Promise((accept) => {
        $inspectorSession.post('Profiler.enable', () => {
            $inspectorSession.post('Profiler.start', () => {
                accept();
            });
        });
    });
}

function $stopProfiler() {
    return new Promise((accept, reject) => {
        $inspectorSession.post('Profiler.stop', (err, data) => {
            if (err) {
                reject(err);
                return;
            } else {
                accept(data);
            }
        });
    });
}

function $reportError(err) {
    console.log("Error on line " + err.line + ": ");
    const codeLines = $code.split("\n");
    console.log(codeLines[err.line - 1]);
    console.log(err.message);
}

// Built-in Functions:"
function range(...args) {
    let start, end;
    if (args.length === 1) {
        start = 0
        end = args[0];
    } else if (args.length === 2) {
        start = args[0];
        end = args[1];
    } else {
        throw new Error("Wrong number of arguments");
    }
    const ret = [];
    for (let i = start; i < end; i++) {
        ret.push(i);
    }
    return $heapAllocate(ret);
}

function split(string, separator) {
    return $heapAllocate(string.split(separator));
}

function repeat(str, times) {
    let output = "";
    for (let i = 0; i < times; i++) {
        output += str;
    }
    return output;
}

function print(...args) {
    console.log(...args);
}

async function prompt(message) {
    return new Promise((accept) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(message + " ", (answer) => {
            rl.close();
            accept(answer);
        });
    });
}

function pop(thing) {
    if ($isHeapRef(thing)) {
        const retval = $heap[thing.id].pop();
        if ($isHeapRef(retval)) {
            $decRefCount(retval);
        }
        return retval;
    } else {
        throw new Error("Cannot pop() for a " + (typeof thing));
    }
}

function push(thing, item) {
    if ($isHeapRef(thing)) {
        const array = $heap[thing.id];
        $incRefCount(item);
        const newArray = [...array, item];
        $logger.logNewObject(newArray);
        $heapUpdate(thing.id, newArray);
        return newArray.length;
    } else {
        throw new Error("Cannot push() for a " + (typeof thing));
    }
}

function concat(one, other) {
    if ($isHeapRef(one) && $isHeapRef(other)) {
        const oneArr = $heap[one.id];
        const otherArr = $heap[other.id];
        const result = oneArr.concat(otherArr);
        for (let item of result) {
            if ($isHeapRef(item)) {
                $incRefCount(item);
            }
        }
        return $heapAllocate(result);
    } else {
        throw new Error("Cannot concat() a " + (typeof one) + " and a " + (typeof other));
    }
}

async function map(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        const results = [];
        for (let item of arr) {
            const result = await fn(item);
            results.push(result);
        }
        for (let item of results) {
            if ($isHeapRef(item)) {
                $incRefCount(item);
            }
        }
        return $heapAllocate(results);
    } else {
        throw new Error("Cannot map() for a " + (typeof thing));
    }
}

function filter(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        const result = arr.filter(fn);
        for (let item of result) {
            if ($isHeapRef(item)) {
                $incRefCount(item);
            }
        }
        return $heapAllocate(result);
    } else {
        throw new Error("Cannot filter() for a " + (typeof thing));
    }
}

function reduce(fn, initValue, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return arr.reduce(fn, initValue);
    } else {
        throw new Error("Cannot reduce() for a " + (typeof thing));
    }
}

function length(thing) {
    return $heapAccess(thing).length;
}

function sqrt(num) {
    return Math.sqrt(num);
}

function sqr(num) {
    return num * num;
}

function join(thing, separator) {
    if ($isHeapRef(thing)) {
        const array = $heap[thing.id];
        return array.join(separator);
    } else {
        throw new Error("Cannot join() for a " + (typeof thing));
    }
}

function floor(num) {
    return Math.floor(num);
}

function parseNumber(string) {
    return Number(string);
}

function has(dict, key) {
    return key in dict;
}

function isString(value) {
    return typeof value === "string";
}

function isNumber(value) {
    return typeof value === "number";
}

async function sleep(ms) {
    return new Promise((accept) => {
        setTimeout(() => accept(), ms);
    });
}

function random() {
    return Math.random();
}

function currentTime() {
    return new Date().getTime();
}

