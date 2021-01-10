export function isRef(value) {
    return value instanceof Object && ("id" in value);
}