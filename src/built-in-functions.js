exports.range = {
    code: `function range(...args) {
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
}`,
    pure: true
};

exports.split = {
    code: `function split(string, separator) {
    return $heapAllocate(string.split(separator));
}`,
    pure: true
};

exports.print = {
    code: `function print(...args) {
    console.log(...args);
}`,
    pure: false
};

exports.pop = {
    code: `function pop(arrayId) {
    return $heapAllocate($heap[arrayId].pop());
}`,
    pure: true
};

exports.push = {
    code: `function push(arrayId, item) {
    const array = $heap[arrayId];
    const newArray = [...array, item];
    $heap = {
        ...$heap,
        [arrayId]: newArray
    };
    return newArray.length;
}`,
    pure: false
};

exports.concat = {
    code: `function concat(oneId, otherId) {
    const one = $heap[oneId];
    const other = $heap[otherId];
    return $heapAllocate(one.concat(other));
}`,
    pure: true
};

exports.map = {
    code: `function map(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.map(fn));
}`,
    pure: true
};

exports.filter = {
    code: `function filter(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.filter(fn));
}`,
    pure: true
};

exports.reduce = {
    code: `function reduce(fn, initValue, arrayId) {
    const arr = $heap[arrayId];
    return arr.reduce(fn, initValue);
}`,
    pure: true
};

exports.count = {
    code: `function count(arrayId) {
    const arr = $heap[arrayId];
    return arr.length;
}`,
    pure: true
};

exports.sqrt = {
    code: `function sqrt(num) {
    return Math.sqrt(num);
}`,
    pure: true
};

exports.sqr = {
    code: `function sqr(num) {
    return num * num;
}`,
    pure: true
};

exports.join = {
    code: `function join(arrayId, separator) {
    const array = $heap[arrayId];
    return array.join(separator);
}`,
    pure: true
};

exports.floor = {
    code: `function floor(num) {
    return Math.floor(num);
}`,
    pure: true
};
