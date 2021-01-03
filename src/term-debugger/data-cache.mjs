import jsonr from "@airportyh/jsonr";

export function DataCache() {
    const self = {
        update,
        get objectMap() { return objectMap },
        get funCallMap() { return funCallMap }
    };
    
    const objectMap = new Map();
    const funCallMap = new Map();
    
    function update(snapshot) {
        // Store new object entries in cache
        for (let key in snapshot.objectMap) {
            const rawValue = snapshot.objectMap[key];
            const parsed = jsonr.parse(rawValue, true);
            objectMap.set(Number(key), parsed);
        }
        
        // Store new fun call entries in cache
        for (let key in snapshot.funCallMap) {
            funCallMap.set(Number(key), snapshot.funCallMap[key]);
        }
    }
    
    return self;
}