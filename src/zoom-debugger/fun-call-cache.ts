import { FunCallExpanded, FunCall } from "./play-lang";
import { fetchJson } from "./fetch-json";

export class FunCallCache {
    map: Map<number, FunCallExpanded | "pending">;
    constructor(private baseUrl: string, private onDataFetched: Function) {
        this.map = new Map();
    }
    
    get(funCall: FunCall): FunCallExpanded | null {
        const value = this.map.get(funCall.id);
        if (!value) {
            this.map.set(funCall.id, "pending");
            this.fetch(funCall);
            return null;
        } else if (value === "pending") {
            return null;
        } else {
            return value;
        }
    }
    
    async fetch(funCall: FunCall) {
        setTimeout(async () => {
            const childFunCalls = await fetchJson(`${this.baseUrl}FunCall?parentId=${funCall.id}`);
            const snapshots = await fetchJson(`${this.baseUrl}Snapshot?funCallId=${funCall.id}`);
            const expanded: FunCallExpanded = {
                ...funCall,
                snapshots,
                childFunCalls
            };
            this.map.set(funCall.id, expanded);
            this.onDataFetched();
        });
    }
}