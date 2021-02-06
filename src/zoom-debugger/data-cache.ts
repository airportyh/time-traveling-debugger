import { FunCallExpanded } from "./play-lang";
import { fetchJson } from "./fetch-json";
const { parse } = require("../../json-like/json-like-parser.js");

export class DataCache {
    objectMap: Map<number, any> = new Map();
    funCallMap: Map<number, FunCallExpanded | "pending"> = new Map();
    constructor(
        private baseUrl: string, 
        private onDataFetched: Function
    ) {}
    
    getFunCallExpanded(id: number): FunCallExpanded | null {
        const value = this.funCallMap.get(id);
        if (!value) {
            this.funCallMap.set(id, "pending");
            this.fetch(id);
            return null;
        } else if (value === "pending") {
            return null;
        } else {
            return value;
        }
    }
    
    getObject(id: number): any {
        return this.objectMap.get(id);
    }
    
    fetch(funCallId: number) {
        setTimeout(async () => {
            const reply = await fetchJson(`${this.baseUrl}FunCallExpanded?id=${funCallId}`);
            const funCallExpanded: FunCallExpanded = {
                id: reply.id,
                fun_name: reply.fun_name,
                locals: reply.locals,
                globals: reply.globals,
                closure_cellvars: reply.closure_cellvars,
                closure_freevars: reply.closure_freevars,
                parent_id: reply.parent_id,
                snapshots: reply.snapshots,
                code_file_id: reply.code_file_id,
                childFunCalls: reply.childFunCalls,
                heapMap: reply.heapMap
            };
            this.loadObjects(reply.objectMap);
            this.funCallMap.set(funCallId, funCallExpanded);
            this.onDataFetched();
        });
    }
    
    loadObjects(objectMap: any) {
        for (let id in objectMap) {
            const object = parse(objectMap[id], true);
            this.objectMap.set(Number(id), object);
        }
    }
}