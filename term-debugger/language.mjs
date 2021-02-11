import jsonLike from "../json-like/json-like.js";

export function isRef(value) {
    return value instanceof Object && "id" in value;
}

export function isHeapRef(value) {
    return value instanceof jsonLike.HeapRef;
}