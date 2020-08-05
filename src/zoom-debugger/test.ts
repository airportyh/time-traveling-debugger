import * as jsonr from "@airportyh/jsonr";
import { HistoryEntry } from "./play-lang";
import { initZoomDebugger } from "./index";

main().catch(err => console.log(err.stack));

async function main() {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.left = "0%";
    element.style.width = "100%";
    element.style.height = "100%";
    document.body.appendChild(element);
    
    const code = await fetchText("ex/tree.play");
    const historyText = await fetchText("ex/tree/tree.history");
    const history: HistoryEntry[] = jsonr.parse(historyText);
    
    initZoomDebugger(element, code, history);
}

async function fetchText(filename) {
    const request = await fetch(filename);
    return request.text();
}