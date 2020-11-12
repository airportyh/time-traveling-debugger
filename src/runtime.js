// Runtime functions

// VDOM functionality temporarily disabled
//const $nativeToVirtualDomMap = new WeakMap();
//const $virtualDomToNativeMap = new Map();

// HISTORY_FILE_PATH should be predefined by the emitted code

// Inspector used for profiler

const inspector = require("inspector");
const $inspectorSession = new inspector.Session();
const readline = require('readline');
const fs = require('fs');
const $sqlite3 = require('better-sqlite3');
const $leveldown = require('leveldown');

class $NullLogger {
    initialize() {}
    logNewObject(object) {}
    logFunCall(call) {}
    logSnapshot(line) {}
    flush() {}
    close() {}
}

/*
Database Logger Implementation
*/

class $SQLiteDBLogger {
    async initialize() {
        try { fs.unlinkSync(HISTORY_FILE_PATH); } catch (e) {}
        this.db = $sqlite3(HISTORY_FILE_PATH);
        this.db.exec("PRAGMA journal_mode=WAL");
        //this.db.exec("PRAGMA cache_size=10000");
        this.db.exec("PRAGMA synchronous = OFF");
        
        const schema = `
        create table Snapshot (
            id integer primary key,
            fun_call_id integer not null,
            stack integer,
            heap integer,
            interop integer,
            line_no integer,
            constraint Snapshot_fk_fun_call_id foreign key (fun_call_id)
                references FunCall(id)
        );

        create table Object (
            id integer primary key,
            data text  -- JSONR format
        );

        create table FunCall (
            id integer primary key,
            fun_name text,
            parameters integer,
            parent_id integer,
            
            constraint FunCall_fk_parent_id foreign key (parent_id)
                references FunCall(id)
        );
        
        create table SourceCode (
            id integer primary key,
            file_path text,
            source text
        );
        `;
        this.db.exec(schema);

        this.insertObjectStatement = this.db.prepare(`insert into Object values (?, ?)`);
        this.insertFunCallStatement = this.db.prepare(`insert into FunCall values (?, ?, ?, ?)`);
        this.insertSnapshotStatement = this.db.prepare(`insert into Snapshot values (?, ?, ?, ?, ?, ?)`);
        this.db
            .prepare(`insert into SourceCode values (1, ?, ?)`)
            .run(SOURCE_FILE_PATH, $code);

        this.pendingNewObjects = [];
        this.pendingFunCalls = [];
        this.pendingSnapshots = [];
    }
    logNewObject(object) {
        const id = $nextObjectId++;
        $objectToIdMap.set(object, id);
        this.pendingNewObjects.push(object);
        return object;
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
        const funCall = $stack ? $stack[0].funCall : null;
        const snapshot = [
            id, 
            funCall, 
            $getObjectId($stack), 
            $getObjectId($heap), 
            $interops && $interops.length && $getObjectId($interops),
            line
        ];
        this.pendingSnapshots.push(snapshot);
        if (id % 500 === 0) {
            this.flush();
        }
    }
    flush() {
        this.db.exec("begin transaction");
        for (let newObject of this.pendingNewObjects) {
            const id = $objectToIdMap.get(newObject);
            this.insertObjectStatement.run(id, $stringify(newObject));
        }
        this.pendingNewObjects = [];
        for (let call of this.pendingFunCalls) {
            this.insertFunCallStatement.run(
                call.id, 
                call.funName, 
                $getObjectId(call.parameters), 
                call.parentId
            );
        }
        this.pendingFunCalls = [];
        for (let snapshot of this.pendingSnapshots) {
            this.insertSnapshotStatement.run(...snapshot);
        }
        this.pendingSnapshots = [];
        this.db.exec("end transaction");
    }
    close() {}
}

/*
Database Logger Implementation ends
*/

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
        const funCall = $stack ? $stack[0].funCall : null;
        const stack = $getObjectId($stack);
        const heap = $getObjectId($heap);
        const interops = $interops && $interops.length && $getObjectId($interops);
        this.stream.write(`snapshot(${id}, ${funCall}, ${stack}, ${heap}, ${interops}, ${line})\n`);
    }
    flush() {
        this.stream.end();
    }
    close() {}
}
/*
File-based Logger Implementation ends
*/

/*
Level DB Logger implementation
*/
class $LevelDBLogger {
    constructor() {
        this.pendingNewObjects = [];
        this.pendingFunCalls = [];
        this.pendingSnapshots = [];
    }
    initialize() {
        this.db = $leveldown(HISTORY_FILE_PATH);
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
        const funCall = $stack ? $stack[0].funCall : null;
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
    flush() {
        const batch = this.db.batch();
        for (let newObject of this.pendingNewObjects) {
            const id = $objectToIdMap.get(newObject);
            batch.put("object:" + id, $stringify(newObject));
        }
        this.pendingNewObjects = [];
        for (let call of this.pendingFunCalls) {
            batch.put("funcall:" + call.id, `${call.funName}, ${$getObjectId(call.parameters)}, ${call.parentId}`);
        }
        this.pendingFunCalls = [];
        for (let snapshot of this.pendingSnapshots) {
            let [id, funCall, stack, heap, interops, line] = snapshot;
            batch.put("snapshot:" + id, `${funCall}, ${stack}, ${heap}, ${interops}, ${line}`);
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

const $isBrowser = typeof document !== "undefined";
const $objectToIdMap = new WeakMap();
const $logger = new $NullLogger();

let $stack = null;

// DB logger variables
let $nextObjectId = 1;
let $nextHeapId = 1;
let $nextFunCallId = 1;
let $nextSnapshotId = 1;
// DB logger variables end

const $emptyObject = {};
let $heap = $emptyObject;   

// ARC variables
let $heapRefCount = $emptyObject;
let $pendingRetVal = null;
// ARC variables end

let $interops = [];
let $halted = false;
let $errorMessage = null;
const $emptyArray = [];

// let $body = $isBrowser && $nativeDomToVDom(document.body);
// let $heapOfLastDomSync = $heap;
let $canvas;
let $canvasContext;
let $canvasXY;

async function $initialize() {
    $inspectorSession.connect();
    if ($isBrowser) {
        $initStyles();
        $initCanvas();
    }

    await $logger.initialize();
    $logger.logNewObject($heap);
}

function $initStyles() {
    const stylesText = `
    * {
        box-sizing: border-box;
    }
    
    body {
        margin: 0;
        padding: 0;
    }
    
    #canvas {
        border: 1px solid black;
        margin: 0;
    }
    
    #canvas-xy {
        font-family: Helvetica, sans-serif;
    }
    
    .current-line {
        background-color: yellow;
        color: black;
    }
    
    .heap-id {
        color: blue;
    }
    
    .heap-object {
        margin-right: 5px;
        margin-bottom: 5px;
    }
    
    .heap-object td {
        padding: 2px;
    }
    
    .error-message {
        color: #e35e54;
        font-family: Helvetica, sans-serif;
    }
    
    .code-line {
        padding: 0 1em;
    }
    
    .stack-frame {
    }
    
    .stack-frame label {
        display: block;
        background-color: gray;
        color: white;
        padding: 0 1em;
    }
    `;
    const style = document.createElement("style");
    style.textContent = stylesText;
    document.body.appendChild(style);
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
                arrayString += `{"id": ${value.id}}`;
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
                objectString += `{"id": ${value.id}}`;
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

function $initCanvas() {
    $canvas = document.getElementById("canvas");
    if ($canvas) {
        $canvasContext = $canvas.getContext("2d");
        $canvasContext.textBaseline = "top";
        $canvasContext.textBaseLine = "top";
        $canvasXY = document.getElementById("canvas-xy");
        $canvas.addEventListener("mousemove", (e) => {
            $canvasXY.textContent = 
                `x = ${e.offsetX.toFixed(0)}   y = ${e.offsetY.toFixed(0)}`;
        });
    }
}

function $pushFrame(funName, variables, closures) {
    $logger.logNewObject(variables);
    for (let varName in variables) {
        const varValue = variables[varName];
        if ($isHeapRef(varValue)) {
            $incRefCount(varValue);
        }
    }
    const parentId = $stack && $stack[0] && $stack[0].funCall || null;
    const id = $logger.logFunCall(funName, variables, parentId);
    const newFrame = {
        funCall: id,
        variables
    };
    $logger.logNewObject(newFrame);
    if (closures) {
        newFrame.closures = closures;
    }
    $stack = [newFrame, $stack];
    $logger.logNewObject($stack);
}

function $popFrame() {
    let frame = $stack[0];
    for (let varName in frame.variables) {
        let varValue = frame.variables[varName];
        if ($isHeapRef(varValue)) {
            $decRefCount(varValue);
            if ($heapRefCount[varValue.id] <= 0) {
                if (varName === "<ret val>") {
                    if ($pendingRetVal && $pendingRetVal.id !== varValue.id && $pendingRetVal.id in $heap) {
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
    $stack = $stack[1];
}

function $removeFromHeap(heapRef) {
    const object = $heap[heapRef.id];
    let newHeap = { ...$heap };
    delete newHeap[heapRef.id];
    $heap = newHeap;
    $logger.logNewObject($heap);
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
    const variables = $stack[0].variables;
    if (varName in variables) {
        return variables[varName];
    } else {
        $errorMessage = `Reference to undefined variable ${varName} encountered.`;
        alert($errorMessage);
        $halted = true;
        throw new Error($errorMessage);
    }
}

function $setVariable(varName, value) {
    const frame = $stack[0];
    const oldValue = frame.variables[varName];
    const newVariables = { ...frame.variables, [varName]: value };
    const newFrame = {
        ...frame,
        variables: newVariables
    };
    $logger.logNewObject(newVariables);
    $logger.logNewObject(newFrame);
    if (value !== oldValue) {
        if ($isHeapRef(value)) {
            $incRefCount(value);
        }
        if ($isHeapRef(oldValue)) {
            $decRefCountAndCleanup(oldValue);
        }
    }
    $stack = [newFrame, $stack[1]];
    $logger.logNewObject($stack);
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

function $getHeapVariable(varName, closureId) {
    const dict = $heapAccess(closureId);
    return dict[varName];
}

function $setHeapVariable(varName, value, closureId) {
    const dict = $heapAccess(closureId);
    const newDict = {
        ...dict,
        [varName]: value
    };
    $logger.logNewObject(newDict);
    $heap[closureId] = newDict;
}

function $isHeapRef(thing) {
    return thing && typeof thing === "object" && typeof thing.id === "number";
}

function $heapAllocate(value) {
    $logger.logNewObject(value);
    const heapId = $nextHeapId;
    $nextHeapId++;
    $heap = {
        ...$heap,
        [heapId]: value
    };
    $logger.logNewObject($heap);
    // For either an array or object
    for (let key in value) {
        let entryValue = value[key];
        if ($isHeapRef(entryValue)) {
            $incRefCount(entryValue);
        }
    }
    return { id: heapId };
}

function $save(line) {
    $logger.logSnapshot(line);
    $interops = $emptyArray;
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
    $heap = {
        ...$heap,
        [thing.id]: newObject
    };
    $logger.logNewObject(newObject);
    $logger.logNewObject($heap);
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
        return $heapAllocate($heap[thing.id].pop());
    } else {
        throw new Error("Cannot pop() for a " + (typeof thing));
    }
}

function push(thing, item) {
    if ($isHeapRef(thing)) {
        const array = $heap[thing.id];
        const newArray = [...array, item];
        $heap = {
            ...$heap,
            [thing.id]: newArray
        };
        $logger.logNewObject(newArray);
        $logger.logNewObject($heap);
        return newArray.length;
    } else {
        throw new Error("Cannot push() for a " + (typeof thing));
    }
}

function concat(one, other) {
    if ($isHeapRef(one) && $isHeapRef(other)) {
        const one = $heap[one.id];
        const other = $heap[other.id];
        return $heapAllocate(one.concat(other));
    } else {
        throw new Error("Cannot concat() a " + (typeof one) + " and a " + (typeof other));
    }
}

function map(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return $heapAllocate(arr.map(fn));
    } else {
        throw new Error("Cannot map() for a " + (typeof thing));
    }
}

function filter(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return $heapAllocate(arr.filter(fn));
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

/*
==  Virtual DOM temporarily disabled ==

function getElementById(id) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return document.getElementById(id);
}

function addStyle(element, stylesId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const styles = $heap[stylesId];
    for (let prop in styles) {
        element.style[prop] = styles[prop];
    }
}

function createElement(tag, attrs, children) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = { tag };
    if (attrs) {
        element.attrs = attrs;
    }
    if (children) {
        element.children = children;
    }
    return $heapAllocate(element);
}

function getDocumentBody() {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return $body;
}

function appendTo(parentId, childId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const parent = $heapAccess(parentId);
    const children = $heapAccess(parent.children) || [];
    const newChildren = $heapAllocate([...children, childId]);
    const newParent = {
        ...parent,
        children: newChildren
    };
    $heap = {
        ...$heap,
        [parentId]: newParent
    };
    syncVDomToDom()
}

function removeFrom(parentId, childId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const parent = $heapAccess(parentId);
    const children = $heapAccess(parent.children) || [];
    const newChildren = $heapAllocate(children.filter((child) => child !== childId));
    const newParent = {
        ...parent,
        children: newChildren
    };
    $heap = {
        ...$heap,
        [parentId]: newParent
    };
    syncVDomToDom()
}

function setText(elementId, text) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $heapAccess(elementId);
    const newChildren = $heapAllocate([text]);
    const newElement = {
        ...element,
        children: newChildren
    };
    $heap = {
        ...$heap,
        [elementId]: newElement
    };
    syncVDomToDom()
}

function setAttribute(elementId, attrName, attrValue) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $heapAccess(elementId);
    const attrs = $heapAccess(element.attrs);
    const newAttrs = $heapAllocate({
        ...attrs,
        [attrName]: attrValue
    });
    const newElement = {
        ...element,
        attrs: newAttrs
    };
    $heap = {
        ...$heap,
        [elementId]: newElement
    };
    syncVDomToDom()
}

function setStyle(elementId, stylesId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const styles = $heapAccess(stylesId);
    const element = $heapAccess(elementId);
    const attrs = $heapAccess(element.attrs);
    const oldStyles = attrs && $heapAccess(attrs.style);
    const newAttrs = $heapAllocate({
        ...attrs,
        style: {
            ...oldStyles,
            ...styles
        }
    });
    const newElement = {
        ...element,
        attrs: newAttrs
    };
    $heap = {
        ...$heap,
        [elementId]: newElement
    };
    syncVDomToDom()
}

function listenTo(elementId, event, listener) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    document.body.addEventListener(event, (event) => {
        const targetId = $nativeToVirtualDomMap.get(event.target);
        if (targetId === elementId) {
            listener(event);
        }
    });
}

function getKey(keyEvent) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return keyEvent.key;
}

function getValue(inputId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.value;
}

function setValue(inputId, value) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    input.value = value;
}

function getChecked(inputId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.checked;
}

function setChecked(inputId, checked) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.checked = checked;
}

function addClass(elementId, clazz) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $virtualDomToNativeMap.get(elementId);
    element.classList.add(clazz);
}

function removeClass(elementId, clazz) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $virtualDomToNativeMap.get(elementId);
    element.classList.remove(clazz);
}


function $nativeDomToVDom(node) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const element = { tag };
        const elementId = $heapAllocate(element);
        const attributeNames = node.getAttributeNames();
        if (attributeNames.length > 0) {
            const attrs = {};
            for (let i = 0; i < attributeNames.length; i++) {
                const attrName = attributeNames[i];
                attrs[attrName] = node.getAttribute(attrName);
            }
            element.attrs = $heapAllocate(attrs);
        }
        const childNodes = node.childNodes;
        if (childNodes.length > 0) {
            const childNodeResults = [];
            for (let i = 0; i < childNodes.length; i++) {
                childNodeResults[i] = $nativeDomToVDom(childNodes[i]);
            }
            element.children = $heapAllocate(childNodeResults);
        }
        $virtualDomToNativeMap.set(elementId, node);
        $nativeToVirtualDomMap.set(node, elementId);
        return elementId;
    } else if (node.nodeType === Node.TEXT_NODE) {
        return node.data;
    } else {
        throw new Error("Unsupported node type: " + node.nodeType);
    }
}

// Generates a Native DOM element out of a Virtual DOM element.
function $vdomToNativeDom(elementId) {
    const element = $heapAccess(elementId);
    if (typeof element === "string") {
        const retval = document.createTextNode(element);
        return retval;
    } else {
        const native = document.createElement(element.tag);
        const attrs = $heapAccess(element.attrs);
        $domSetAttrs(native, attrs);
        const children = $heapAccess(element.children);
        if (children) {
            for (let i = 0; i < children.length; i++) {
                native.appendChild($vdomToNativeDom(children[i]));
            }
        }
        $virtualDomToNativeMap.set(elementId, native);
        $nativeToVirtualDomMap.set(native, elementId);
        return native;
    }
}

// Synchronises the current virtual DOM state contained in `$body` to `document.body`.
// This works by calculating the difference of `$body` between its state since the
// last time it was synchronised and its current state, this is done with the `compare`
// function. Then, for each difference, we mutate the native DOM with that difference.
function syncVDomToDom() {
    const diff = compare(1, $heapOfLastDomSync, 1, $heap);
    const mutations = [];
    for (let i = 0; i < diff.length; i++) {
        const update = diff[i];
        mutations.push(...collectNativeDomMutations(document.body, update));
    }
    for (let action of mutations) {
        action();
    }
    $heapOfLastDomSync = $heap;

    function collectNativeDomMutations(element, update) {
        const { path, value } = update;
        if (path.length === 0) {
            throw new Error("Unexpected state, path elements should have been consumed.");
        }
        const [prop, ...restPath] = path;
        if (prop === "children") {
            if (restPath.length === 0) {
                if (update.type === "addition") {
                    const children = $heapAccess(value);
                    if (!Array.isArray(children)) {
                        throw new Error("Expected value to be an array");
                    }
                    return children.map(
                        (child) =>
                            () =>
                                element.appendChild($vdomToNativeDom(child))
                    );
                } else if (update.type === "deletion") {
                    return [() => element.innerHTML = ""];
                }
            } else {
                const [idx, ...restRestPath] = restPath;
                if (restRestPath.length === 0) {
                    if (update.type === "deletion") {
                        if (element.childNodes[idx]) {
                            const childElement = element.childNodes[idx];
                            return [() => element.removeChild(childElement)];
                        } else {
                            throw new Error("Unhandled case");
                        }
                    } else if (update.type === "addition") {
                        return [() => element.insertBefore($vdomToNativeDom(value), element.childNodes[idx])];
                    } else if (update.type === "replacement") {
                        return [() => element.replaceChild($vdomToNativeDom(value), element.childNodes[idx])];
                    } else {
                        throw new Error("Unknown update type: " + update.type);
                    }
                } else {
                    return collectNativeDomMutations(element.childNodes[idx], {
                        type: update.type,
                        path: restRestPath,
                        value: value
                    });
                }
            }
        } else if (prop === "attrs") {
            if (restPath.length === 1) {
                const [prop] = restPath;
                return [() => $domSetAttrs(element, { [prop]: value })];
            } else if (restPath.length === 0) {
                return [() => $domSetAttrs(element, value)];
            } else {
                throw new Error("Attributes should not be nested deeper than 1 level as is the case with 'styles'.");
            }
        } else { // it's a number
            throw new Error("Not handling this case yet");
        }
    }
}

// Sets the attributes on a native DOM element. The second parameter `attrs` is assumed
// to be an object with attribute name/attribute value pairs, with the exception that
// if the attribute name is style, then the attribute value is assumed to be a nested
// object containing style name/style value pairs.
function $domSetAttrs(native, attrs) {
    if (attrs) {
        for (let key in attrs) {
            if (key === "style") {
                const styles = attrs.style;
                const styleStrings = [];
                for (let prop in styles) {
                    styleStrings.push(prop + ": " + styles[prop]);
                }
                native.setAttribute("style", styleStrings.join("; "));
            } else {
                native.setAttribute(key, attrs[key]);
            }
        }
    }
}

// Deep compare of two objects within two different heaps. This is for
// the virtual DOM difference calculation.
function compare(source, heap1, destination, heap2) {
    return compareAt([], source, destination);

    function isObject(value) {
        const type = typeof value
        return value != null && (type === 'object' || type === 'function')
    }

    function difference(arr1, arr2) {
        const result = [];
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) === -1) {
                result.push(arr1[i]);
            }
        }
        return result;
    }

    function intersection(arr1, arr2) {
        const result = [];
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) !== -1) {
                result.push(arr1[i]);
            }
        }
        return result;
    }

    function heapAccess(id, heap) {
        if (typeof id === "string") {
            return id;
        }
        return heap[id];
    }

    function compareAt(path, source, destination) {
        if (isObject(heapAccess(source, heap1)) && isObject(heapAccess(destination, heap2))) {
            return compareObjectsAt(path, source, destination);
        } else {
            if (source === destination) {
                return [];
            } else {
                return [
                    {
                        type: "replacement",
                        path: path,
                        oldValue: source,
                        value: destination
                    }
                ];
            }
        }
    }

    function compareObjectsAt(path, source, destination) {
        source = heapAccess(source, heap1);
        destination = heapAccess(destination, heap2);
        const sourceKeys = Object.keys(source);
        const destinationKeys = Object.keys(destination);
        const sourceOnlyKeys = difference(sourceKeys, destinationKeys);
        const commonKeys = intersection(sourceKeys, destinationKeys);
        const destinationOnlyKeys = difference(destinationKeys, sourceKeys);
        const additions = destinationOnlyKeys.map((key) => ({
            type: "addition",
            path: [...path, key],
            value: destination[key]
        }));
        const removals = sourceOnlyKeys.map((key) => ({
            type: "deletion",
            path: [...path, key]
        }));

        const childDiffs = [];
        for (let i = 0; i < commonKeys.length; i++) {
            const key = commonKeys[i];
            const result = compareAt([...path, key], source[key], destination[key]);
            childDiffs.push(...result);
        }

        return [
            ...additions,
            ...removals,
            ...childDiffs
        ];
    }

}
*/

// Time-Traveling Debugger UI
async function sleep(ms) {
    return new Promise((accept) => {
        setTimeout(() => accept(), ms);
    });
}

// Canvas


// interop functions

function fillRect(x, y, width, height) {
    $canvasContext.fillRect(x, y, width, height);
}
fillRect = $interop(fillRect);

function fillCircle(x, y, radius) {
    $canvasContext.beginPath();
    $canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
    $canvasContext.fill();
}
fillCircle = $interop(fillCircle);

function drawLine(x1, y1, x2, y2) {
    $canvasContext.beginPath();
    $canvasContext.moveTo(x1, y1);
    $canvasContext.lineTo(x2, y2);
    $canvasContext.stroke(); 
}
drawLine = $interop(drawLine);

function setFont(font) {
    $canvasContext.font = font;
}
setFont = $interop(setFont);

function fillText(text, x, y) {
    $canvasContext.fillText(text, x, y);
}
fillText = $interop(fillText);

function setLineWidth(width) {
    $canvasContext.lineWidth = width;
}
setLineWidth = $interop(setLineWidth);

function setLineColor(color) {
    $canvasContext.strokeStyle = color;
}
setLineColor = $interop(setLineColor);

function clear() {
    $canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);
}
clear = $interop(clear, true);

function drawText(text, x, y) {
    $canvasContext.fillText(text, x, y);
}
drawText = $interop(drawText);

function setColor(color) {
    $canvasContext.fillStyle = color;
}
setColor = $interop(setColor);

function setLineCap(lineCap) {
    $canvasContext.lineCap = lineCap;
}
setLineCap = $interop(setLineCap);

function drawArc(x, y, radius, startDegree, endDegree) {
    $canvasContext.beginPath();
    startRadian = (startDegree - 90) / 180 * Math.PI;
    endRadian = (endDegree - 90) / 180 * Math.PI;
    $canvasContext.arc(x, y, radius, startRadian, endRadian);
    $canvasContext.stroke();
}
drawArc = $interop(drawArc);

function $interop(fun, reset) {
    const ret = function(...args) {
        const result = fun(...args);
        const entry = {
            type: "interop",
            fun: fun.name,
            arguments: args
        };
        if (reset) {
            entry.reset = reset;
        }
        $interops.push(entry);
        return result;
    };
    ret.original = fun;
    return ret;
}

async function waitForEvent(eventName) {
    return new Promise((accept) => {
        const callback = (event) => {
            $canvas.removeEventListener(eventName, callback);
            const eventObject = $heapAllocate({
                type: event.type,
                x: event.x,
                y: event.y
            });
            accept(eventObject);
        };
        $canvas.addEventListener(eventName, callback);
    });
}

function random() {
    return Math.random();
}

function currentTime() {
    return new Date().getTime();
}

