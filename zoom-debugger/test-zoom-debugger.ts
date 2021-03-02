import { initZoomDebugger } from "./zoom-debugger";
import { PythonASTInfo } from "./python-ast-info";
import { DataCache } from "./data-cache";

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
    const DEBUGGER_API = "http://localhost:1337/api/";
    // const cache = new DataCache("http://localhost:1337/api/", render);
    // const fun = cache.getFunCallExpanded(3);
    // console.log("fun", fun);
    // function render() {
    //     const fun = cache.getFunCallExpanded(3);
    //     console.log("fun", fun);
    // }
    await initZoomDebugger(element, DEBUGGER_API);
    // await PythonASTInfo.test();
}