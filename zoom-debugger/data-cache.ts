import { FunCallExpanded } from "./play-lang";
import { fetchJson } from "./fetch-json";
import { ASTInfo } from "./ast-info";
import { PythonASTInfo } from "./python-ast-info";
import { PlayLangASTInfo } from "./play-lang-ast-info";
const { parse, HeapRef } = require("../json-like/json-like.js");

export type CodeInfo = {
    ast: any,
    codeFile: any,
    codeLines: string[],
    astInfo: ASTInfo
}

export class DataCache {
    objectMap: Map<number, any> = new Map();
    funCallMap: Map<number, FunCallExpanded | "pending"> = new Map();
    codeInfoMap: Map<number, CodeInfo | "pending"> = new Map();
    constructor(
        private baseUrl: string, 
        private onDataFetched: Function
    ) {}
    
    getFunCallExpanded(id: number): FunCallExpanded | null {
        const value = this.funCallMap.get(id);
        if (!value) {
            this.funCallMap.set(id, "pending");
            this.fetchFunCall(id);
            return null;
        } else if (value === "pending") {
            return null;
        } else {
            return value;
        }
    }
    
    getCodeInfo(id: number): CodeInfo | null {
        const value = this.codeInfoMap.get(id);
        if (!value) {
            this.codeInfoMap.set(id, "pending");
            this.fetchCodeInfo(id);
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
    
    fetchCodeInfo(codeFileId: number) {
        setTimeout(async () => {
            const baseUrl = this.baseUrl;
            const codeFile = await fetchJson(`${baseUrl}CodeFile?id=${codeFileId}`);
            const codeLines = codeFile.source.split("\n");
            if (codeFile.file_path.endsWith(".py")) {
                let ast = await fetchJson(`${baseUrl}PythonAST?id=1`);
                let astInfo = new PythonASTInfo(ast, codeLines);
                this.codeInfoMap.set(codeFileId, {
                    ast,
                    codeFile,
                    astInfo,
                    codeLines
                });
            } else if (codeFile.file_path.endsWith(".play")) {
                let ast = parse(codeFile.source);
                let astInfo = new PlayLangASTInfo(ast, codeLines);
                this.codeInfoMap.set(codeFileId, {
                    ast,
                    codeFile,
                    astInfo,
                    codeLines
                });
            } else {
                throw new Error("Don't know how to create AST Info for " + codeFile.file_path);
            }
        });
    }
    
    fetchFunCall(funCallId: number) {
        setTimeout(async () => {
            const reply = await fetchJson(`${this.baseUrl}FunCallExpanded?id=${funCallId}`);
            const funCallExpanded: FunCallExpanded = {
                id: reply.id,
                fun_name: reply.fun_name,
                locals: reply.locals,
                globals: reply.globals,
                closure_cellvars: parse(reply.closure_cellvars),
                closure_freevars: parse(reply.closure_freevars),
                parent_id: reply.parent_id,
                snapshots: reply.snapshots,
                code_file_id: reply.code_file_id,
                childFunCalls: reply.childFunCalls,
                heapMap: reply.heapMap
            };
            
            this.loadObjects(reply.objectMap);
            this.stringifyGlobalsMaps(reply);
            
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
    
    /*
    With the Python recorder, the global variables dicts end up with HeapRefs in the keys where the HeapRefs
    reference strings. This method converts the HeapRefs to actual strings so that the globals map can be
    looked up via the global variable names from the assignment operations in the source code.
    */
    stringifyGlobalsMaps(reply: any) {
        if (reply.globals) {
            for (let snapshot of reply.snapshots) {
                const oid = reply.heapMap[snapshot.heap + "/" + reply.globals];
                const globals = this.objectMap.get(oid);
                if (globals) {
                    stringifyKeys(globals, reply.heapMap, snapshot.heap, this.objectMap);
                }
            }
        }
    }
}

function stringifyKeys(map: any, heapMap: any, heapVersion: any, objectMap: any) {
    for (let key of map.keys()) {
        if (key instanceof HeapRef) {
            const stringKey = objectMap.get(heapMap[heapVersion + "/" + key.id]);
            map.set(stringKey, map.get(key));
            map.delete(key);
        }
    }
}