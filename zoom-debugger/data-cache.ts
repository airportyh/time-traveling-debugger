import { FunCall, Snapshot } from "./play-lang";
import { fetchJson } from "./fetch-json";
import { ASTInfo } from "./ast-info";
import { PlayLangASTInfo } from "./play-lang-ast-info";
import { PythonASTInfo } from "./python-ast-info";
const { parse, HeapRef } = require("../json-like/json-like.js");

const PENDING = {};

export type CodeInfo = {
    ast: any,
    codeFile: any,
    codeLines: string[],
    astInfo: ASTInfo
}

export class DataCache {
    map: Map<string, any> = new Map();
    // objectMap: Map<number, any> = new Map();
    // funCallMap: Map<number, FunCallExpanded | "pending"> = new Map();
    // codeInfoMap: Map<number, CodeInfo | "pending"> = new Map();
    constructor(
        private baseUrl: string, 
        private onDataFetched: Function
    ) {}
    
    async fetchRootFunCall(): Promise<FunCall> {
        const funCall = await fetchJson(`${this.baseUrl}RootFunCall`);
        this.loadFunCall(funCall);
        return funCall;
    }
    
    getFunCallExpanded(id: number): boolean {
        const snapshotsKey = "FunCall/" + id + "/SnapshotIds";
        const snapshotIds = this.map.get(snapshotsKey);
        if (!snapshotIds) {
            this.map.set(snapshotsKey, PENDING);
            this.fetchFunCallExpanded(id);
            return false;
        } else if (snapshotIds === PENDING) {
            return false;
        } else {
            return true;
        }
    }
    
    getObject(id: number): any {
        return this.map.get("Object/" + id);
    }
    
    getCodeFile(id: number): any {
        return this.map.get("CodeFile/" + id);
    }
    
    getCodeInfo(id: number): CodeInfo | null {
        // lazy init a code info object
        const key = "CodeInfo/" + id;
        const codeInfo = this.map.get(key);
        if (!codeInfo) {
            const codeFile = this.getCodeFile(id);
            if (codeFile) {
                this.map.set(key, PENDING);
                this.fetchCodeInfo(codeFile);    
            }
            return null;
        } else if (codeInfo === PENDING) {
            return null;
        } else {
            return codeInfo;
        }
    }
    
    async fetchCodeInfo(codeFile: any) {
        setTimeout(async () => {
            let ast: any;
            const codeLines = codeFile.source.split("\n");
            let astInfo: ASTInfo;
            if (codeFile.file_path.endsWith(".play")) {
                ast = parse(codeFile.source);
                astInfo = new PlayLangASTInfo(ast, codeLines);
            } else {
                ast = await fetchJson(`${this.baseUrl}PythonAST?id=${codeFile.id}`);
                astInfo = new PythonASTInfo(ast, codeLines);
            }
            const codeInfo = {
                ast,
                codeFile,
                codeLines,
                astInfo
            };
            this.map.set("CodeInfo/" + codeFile.id, codeInfo);
            this.onDataFetched();
        });
    }
    
    getFunCall(id: number): any {
        return this.map.get("FunCall/" + id);
    }
    
    getFun(id: number): any {
        return this.map.get("Fun/" + id);
    }
    
    getSnapshot(id: number): Snapshot {
        return this.map.get("Snapshot/" + id);
    }
    
    getFunCallChildFunCalls(id: number): FunCall[] {
        const ids = this.map.get("FunCall/" + id + "/ChildFunCallIds");
        if (!ids) {
            return null;
        }
        const children = [];
        for (let id of ids) {
            children.push(this.getFunCall(id));
        }
        return children;
    }
    
    getFunCallSnapshots(id: number): Snapshot[] {
        const ids = this.map.get("FunCall/" + id + "/SnapshotIds");
        if (!ids) {
            return null;
        }
        const children = [];
        for (let id of ids) {
            children.push(this.getSnapshot(id));
        }
        return children;
    }
    
    heapLookup(heapVersion: number, heapId: number): number {
        return this.map.get("HeapRef/" + heapVersion + "/" + heapId);
    }
    
    getHeapObject(heapVersion: number, heapId: number): any {
        return this.getObject(this.heapLookup(heapVersion, heapId));
    }
    
    fetchFunCallExpanded(funCallId: number) {
        setTimeout(async () => {
            const funCall = await fetchJson(`${this.baseUrl}FunCallExpanded?id=${funCallId}`);
            this.loadFunCall(funCall);
        });
    }
    
    loadFunCall(funCall: any) {
        const attachments = funCall.attachments;
        delete funCall.attachments;
        if (funCall.closure_cellvars) {
            funCall.closure_cellvars = parse(funCall.closure_cellvars);
        }
        if (funCall.closure_freevars) {
            funCall.closure_freevars = parse(funCall.closure_freevars);
        }
        this.map.set("FunCall/" + funCall.id, funCall);
        
        for (let key in attachments) {
            let data = attachments[key];
            if (key.startsWith("Object/")) {
                data = parse(data);
            }
            if (key.startsWith("FunCall/")) {
                if (data.closure_cellvars) {
                    data.closure_cellvars = parse(data.closure_cellvars);
                }
                if (data.closure_freevars) {
                    data.closure_freevars = parse(data.closure_freevars);
                }
            }
            this.map.set(key, data);
        }
        this.stringifyGlobalsMaps(funCall);
        this.onDataFetched();
    }
    
    /*
    With the Python recorder, the global variables dicts end up with HeapRefs in the keys where the HeapRefs
    reference strings. This method converts the HeapRefs to actual strings so that the globals map can be
    looked up via the global variable names from the assignment operations in the source code.
    */
    stringifyGlobalsMaps(funCall: FunCall) {
        if (funCall.globals) {
            const snapshots = this.getFunCallSnapshots(funCall.id);
            if (!snapshots) return;
            for (let snapshot of snapshots) {
                const oid = this.heapLookup(snapshot.heap, funCall.globals);
                const globals = this.getObject(oid);
                if (globals) {
                    this.stringifyKeys(globals, snapshot.heap);
                }
            }
        }
    }
    
    stringifyKeys(map: any, heapVersion: any) {
        for (let key of map.keys()) {
            if (key instanceof HeapRef) {
                const stringKey = this.getHeapObject(heapVersion, key.id);
                map.set(stringKey, map.get(key));
                map.delete(key);
            }
        }
    }
}

