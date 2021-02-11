import jsonLike from "../json-like/json-like.js";
import { inspect } from "util";
import fetch from "node-fetch";

export function DataCache(db) {
    const self = {
        update,
        get objectMap() { return objectMap },
        get funCallMap() { return funCallMap },
        get codeFileMap() { return codeFileMap },
    };
    
    const log = db.log;
    const objectMap = new Map();
    const funCallMap = new Map();
    const codeFileMap = new Map();
    
    async function update(snapshot) {
        // Store new object entries in cache
        for (let key in snapshot.objectMap) {
            const rawValue = snapshot.objectMap[key];
            const parsed = jsonLike.parse(rawValue, true);
            objectMap.set(Number(key), parsed);
        }
        
        // Store new fun call entries in cache
        for (let key in snapshot.funCallMap) {
            funCallMap.set(Number(key), snapshot.funCallMap[key]);
        }
        
        // fetch code file if needed
        const funCall = funCallMap.get(snapshot.fun_call_id);
        if (funCall.code_file_id) {
            if (!codeFileMap.has(funCall.code_file_id)) {
                const response = await fetch(`${db.apiUrl}/api/CodeFile?id=${funCall.code_file_id}`);
                const codeFile = await response.json();
                codeFileMap.set(funCall.code_file_id, codeFile);
            }
        }
    }
    
    return self;
}