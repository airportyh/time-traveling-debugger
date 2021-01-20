export function isRef(value) {
    return value instanceof Object && "id" in value;
}

export function isHeapRef(value) {
    return value instanceof Map && value.has("id");
}