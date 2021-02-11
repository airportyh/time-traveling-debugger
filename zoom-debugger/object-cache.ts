import { DBObject } from "./play-lang";
import { fetchJson } from "./fetch-json";
const { parse } = require("../json-like/json-like.js");

export class ObjectCache {
    map: Map<number, any | "pending">;
    constructor(private baseUrl: string, private onDataFetched: Function) {
        this.map = new Map();
    }
    
    get(id: number): any | null {
        if (typeof id !== "number") {
            throw new Error("calling object cache.get with a non-number: " + JSON.stringify(id));
        }
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
        setTimeout(async () => {
            let object = (await fetchJson(`${this.baseUrl}Object?id=${id}`))[0];
            if (!object) {
                throw new Error("Got no data for object " + JSON.stringify(id));
            }
            object = parse(object.data, true);
            this.map.set(id, object);
            this.onDataFetched();
        });
    }
}