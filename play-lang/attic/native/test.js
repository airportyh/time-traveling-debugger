var stringify = require('bindings')('stringify');

const idMap = new WeakMap();
const jerry = {
    name: "Jerry"
};
const jess = {
    name: "Jess"
};
const toby = {
    name: "Toby",
    age: 40
};
idMap.set(jerry, 1);
idMap.set(jess, 2);
idMap.set(toby, 3);
const friends = [ jerry, jess ];

idMap.set(friends, 4);

const obj = {
    name: "Emma",
    age: 12,
    underage: true,
    smart: false,
    friends: friends,
    parent: toby
};
idMap.set(obj, 5);

console.log("JS:");
console.log(jsStringify(obj, idMap));

console.log("Native:");
console.log(stringify(obj, idMap));

function jsStringify(object, idMap) {
    return $stringify(object, idMap, true);
}

function $stringify(object, idMap, firstLevel) {
    if (!firstLevel && idMap.has(object)) {
        return "*" + idMap.get(object);
    }
    if (Array.isArray(object)) {
        let arrayString = "[";
        const parts = [];
        for (let i = 0; i < object.length; i++) {
            if (i > 0) {
                arrayString += ",";
            }
            arrayString += $stringify(object[i], idMap, false);
        }
        arrayString += "]";
        return arrayString;
    } else if (typeof object === "object") {
        let objectString = "{";
        let first = true;
        for (let key in object) {
            if (!first) {
                objectString += ",";    
            } else {
                first = false;
            }
            objectString += '"' + key + '":' + $stringify(object[key], idMap, false);
        }
        objectString += "}";
        return objectString;
    } else {
        return JSON.stringify(object);
    }
}