import jsonLike from "../json-like/json-like.js";
import { inspect } from "util";
import fetch from "node-fetch";

export function DataCache(db) {
    const self = {
        update,
        get objectMap() { return objectMap },
        get funCallMap() { return funCallMap },
        get funMap() { return funMap },
        get codeFileMap() { return codeFileMap },
    };
    
    const log = db.log;
    const objectMap = new Map();
    const funCallMap = new Map();
    const funMap = new Map();
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
        if (!funMap.has(funCall.fun_id)) {
            const response = await fetch(`${db.apiUrl}/api/Fun?id=${funCall.fun_id}`);
            const fun = await response.json();
            funMap.set(funCall.fun_id, fun);
        }
        const fun = funMap.get(funCall.fun_id);
        if (fun.code_file_id) {
            if (!codeFileMap.has(fun.code_file_id)) {
                const response = await fetch(`${db.apiUrl}/api/CodeFile?id=${fun.code_file_id}`);
                const codeFile = await response.json();
                codeFileMap.set(fun.code_file_id, codeFile);
            }
        }
    }
    
    return self;
}