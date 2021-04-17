import jsonLike from "../json-like/json-like.js";
import { inspect } from "util";

export function DataCache(db) {
    const self = {
        update,
        getObject,
        getFunCall,
        getFun,
        getCodeFile,
        heapLookup,
        getHeapObject
    };
    
    const log = db.log;
    const map = new Map();
    
    async function update(snapshot) {
        for (let key in snapshot.attachments) {
            let data = snapshot.attachments[key];
            if (key.startsWith("Object/")) {
                data = jsonLike.parse(data, true);
            }
            // log.write(`adding map entry: ${key} = ${inspect(data)}\n`);
            map.set(key, data);
        }
    }
    
    function getObject(id) {
        return map.get("Object/" + id);
    }
    
    function getFunCall(id) {
        return map.get("FunCall/" + id);
    }
    
    function getFun(id) {
        return map.get("Fun/" + id);
    }
    
    function heapLookup(heapVersion, heapId) {
        return map.get("HeapRef/" + heapVersion + "/" + heapId);
    }
    
    function getHeapObject(heapVersion, heapId) {
        return getObject(heapLookup(heapVersion, heapId));
    }
    
    function getCodeFile(id) {
        return map.get("CodeFile/" + id);
    }
    
    return self;
}