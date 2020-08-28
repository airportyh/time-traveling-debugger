import { DBObject } from "./play-lang";
import { fetchJson } from "./fetch-json";

export class ObjectCache {
    map: Map<number, DBObject | "pending">;
    constructor(private baseUrl: string, private onDataFetched: Function) {
        this.map = new Map();
    }
    
    get(id: number): DBObject | null {
        const value = this.map.get(id);
        if (!value) {
            this.map.set(id, "pending");
            this.fetch(id);
            return null;
        } else if (value === "pending") {
            return null;
        } else {
            return value;
        }
    }
    
    async fetch(id: number) {
        console.log("fetching object with id: " + id);
        const object = (await fetchJson(`${this.baseUrl}Object?id=${id}`))[0];
        this.map.set(id, object);
        this.onDataFetched();
    }
}