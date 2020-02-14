// Runtime functions
const jsonr = require("@airportyh/jsonr");
const $history = [];
let $stack = [];
let $nextHeapId = 1;
let $heap = {};

function $pushFrame(funName, variables) {
    const newFrame = { funName, parameters: variables, variables };
    $stack = [...$stack, newFrame];
}

function $popFrame() {
    $stack = $stack.slice(0, $stack.length - 1);
}

function $setVariable(varName, value, line) {
    const frame = $stack[$stack.length - 1];
    const newFrame = {
        ...frame,
        variables: { ...frame.variables, [varName]: value }
    };
    $stack = [...$stack.slice(0, $stack.length - 1), newFrame];
}

function $heapAllocate(value) {
    const id = $nextHeapId;
    $nextHeapId++;
    $heap = {
        ...$heap,
        [id]: value
    };
    return id;
}

function $save(line) {
    $history.push({ line, stack: $stack, heap: $heap });
}

function $getVariable(varName) {
    return $stack[$stack.length - 1].variables[varName];
}

function $heapAccess(id) {
    if (typeof id === "string") {
        return id;
    }
    return $heap[id];
}

function $get(id, index) {
    if (typeof id === "string") {
        return id[index];
    }
    const object = $heap[id];
    return object[index];
}

function $set(id, index, value) {
    const object = $heap[id];
    let newObject;
    if (Array.isArray(object)) {
        newObject = object.slice();
        newObject[index] = value;
    } else {
        newObject = {
            ...$heap[id],
            [index]: value
        };
    }
    $heap = {
        ...$heap,
        [id]: newObject
    };
}

function $saveHistory(filePath) {
    require("fs").writeFile(
        filePath,
        jsonr.stringify($history, "	"),
        () => undefined
    );
}

async function main() {
    var $immediateReturnValue;
    $pushFrame("main", {  });
    try {
        $save(2);
        print("Hello, world");
    } finally {
        $save(3);
        $popFrame();
    }
}

main().catch(err => console.log(err.message)).finally(() => $saveHistory("hello.history"));

// Built-in Functions:

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

function print(...args) {
    console.log(...args);
}

function pop(arrayId) {
    return $heapAllocate($heap[arrayId].pop());
}

function push(arrayId, item) {
    const array = $heap[arrayId];
    const newArray = [...array, item];
    $heap = {
        ...$heap,
        [arrayId]: newArray
    };
    return newArray.length;
}

function concat(oneId, otherId) {
    const one = $heap[oneId];
    const other = $heap[otherId];
    return $heapAllocate(one.concat(other));
}

function map(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.map(fn));
}

function filter(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.filter(fn));
}

function reduce(fn, initValue, arrayId) {
    const arr = $heap[arrayId];
    return arr.reduce(fn, initValue);
}

function count(arrayId) {
    const arr = $heap[arrayId];
    return arr.length;
}

function sqrt(num) {
    return Math.sqrt(num);
}

function sqr(num) {
    return num * num;
}

function join(arrayId, separator) {
    const array = $heap[arrayId];
    return array.join(separator);
}

function floor(num) {
    return Math.floor(num);
}