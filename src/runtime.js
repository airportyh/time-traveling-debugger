// Runtime functions
const $isBrowser = typeof document !== "undefined";
const $history = [];
let $historyCursor = -1;
let $stack = [];
let $nextHeapId = 1;
let $heap = {};
let $body = $isBrowser && $nativeDomToVDom(document.body);
let $heapOfLastDomSync = $heap;

function $pushFrame(funName, variables) {
    const newFrame = { funName, parameters: variables, variables };
    $stack = [...$stack, newFrame];
}

function $popFrame() {
    $stack = $stack.slice(0, $stack.length - 1);
}

function $setVariable(varName, value, line) {
    const frame = $stack[$stack.length - 1];
    const newFrame = {
        ...frame,
        variables: { ...frame.variables, [varName]: value }
    };
    $stack = [...$stack.slice(0, $stack.length - 1), newFrame];
}

function $heapAllocate(value) {
    const id = $nextHeapId;
    $nextHeapId++;
    $heap = {
        ...$heap,
        [id]: value
    };
    return id;
}

function $save(line) {
    $history.push({ line, stack: $stack, heap: $heap, body: $body });
    $historyCursor++;
}

function $getVariable(varName) {
    return $stack[$stack.length - 1].variables[varName];
}

function $heapAccess(id) {
    if (typeof id === "string") {
        return id;
    }
    return $heap[id];
}

function $get(id, index) {
    if (typeof id === "string") {
        return id[index];
    }
    const object = $heap[id];
    return object[index];
}

function $set(id, index, value) {
    const object = $heap[id];
    let newObject;
    if (Array.isArray(object)) {
        newObject = object.slice();
        newObject[index] = value;
    } else {
        newObject = {
            ...$heap[id],
            [index]: value
        };
    }
    $heap = {
        ...$heap,
        [id]: newObject
    };
}

function $saveHistory(filePath) {
    if ($isBrowser) {
        return;
    }
    const jsonr = require("@airportyh/jsonr");
    require("fs").writeFile(
        filePath,
        jsonr.stringify($history, "	"),
        () => undefined
    );
}

// Built-in Functions:"
function range(...args) {
    let start, end;
    if (args.length === 1) {
        start = 0
        end = args[0];
    } else if (args.length === 2) {
        start = args[0];
        end = args[1];
    } else {
        throw new Error("Wrong number of arguments");
    }
    const ret = [];
    for (let i = start; i < end; i++) {
        ret.push(i);
    }
    return $heapAllocate(ret);
}

function split(string, separator) {
    return $heapAllocate(string.split(separator));
}

function print(...args) {
    console.log(...args);
}

function pop(arrayId) {
    return $heapAllocate($heap[arrayId].pop());
}

function push(arrayId, item) {
    const array = $heap[arrayId];
    const newArray = [...array, item];
    $heap = {
        ...$heap,
        [arrayId]: newArray
    };
    return newArray.length;
}

function concat(oneId, otherId) {
    const one = $heap[oneId];
    const other = $heap[otherId];
    return $heapAllocate(one.concat(other));
}

function map(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.map(fn));
}

function filter(fn, arrayId) {
    const arr = $heap[arrayId];
    return $heapAllocate(arr.filter(fn));
}

function reduce(fn, initValue, arrayId) {
    const arr = $heap[arrayId];
    return arr.reduce(fn, initValue);
}

function count(arrayId) {
    const arr = $heap[arrayId];
    return arr.length;
}

function sqrt(num) {
    return Math.sqrt(num);
}

function sqr(num) {
    return num * num;
}

function join(arrayId, separator) {
    const array = $heap[arrayId];
    return array.join(separator);
}

function floor(num) {
    return Math.floor(num);
}

function getElementById(id) {
    return document.getElementById(id);
}

function addStyle(element, stylesId) {
    const styles = $heap[stylesId];
    for (let prop in styles) {
        element.style[prop] = styles[prop];
    }
}

function $nativeDomToVDom(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const element = { tag };
        const elementId = $heapAllocate(element);
        const attributeNames = node.getAttributeNames();
        if (attributeNames.length > 0) {
            const attrs = {};
            for (let i = 0; i < attributeNames.length; i++) {
                const attrName = attributeNames[i];
                attrs[attrName] = node.getAttribute(attrName);
            }
            element.attrs = $heapAllocate(attrs);
        }
        const childNodes = node.childNodes;
        if (childNodes.length > 0) {
            const childNodeResults = [];
            for (let i = 0; i < childNodes.length; i++) {
                childNodeResults[i] = $nativeDomToVDom(childNodes[i]);
            }
            element.children = $heapAllocate(childNodeResults);
        }
        return elementId;
    } else if (node.nodeType === Node.TEXT_NODE) {
        return node.data;
    } else {
        throw new Error("Unsupported node type: " + node.nodeType);
    }
}

function createElement(tag, attrs, children) {
    const element = { tag };
    if (attrs) {
        element.attrs = attrs;
    }
    if (children) {
        element.children = children;
    }
    return $heapAllocate(element);
}

function getDocumentBody() {
    return $body;
}

function appendTo(parentId, childId) {
    const parent = $heapAccess(parentId);
    const children = $heapAccess(parent.children) || [];
    const newChildren = $heapAllocate([...children, childId]);
    const newParent = {
        ...parent,
        children: newChildren
    };
    $heap = {
        ...$heap,
        [parentId]: newParent
    };
    syncVDomToDom()
}

function setText(elementId, text) {
    const element = $heapAccess(elementId);
    const newChildren = $heapAllocate([text]);
    const newElement = {
        ...element,
        children: newChildren
    };
    $heap = {
        ...$heap,
        [elementId]: newElement
    };
    syncVDomToDom()
}

function setStyle(elementId, stylesId) {
    const styles = $heapAccess(stylesId);
    const element = $heapAccess(elementId);
    const attrs = $heapAccess(element.attrs);
    const oldStyles = attrs && $heapAccess(attrs.style);
    const newAttrs = $heapAllocate({
        ...attrs,
        style: {
            ...oldStyles,
            ...styles
        }
    });
    const newElement = {
        ...element,
        attrs: newAttrs
    };
    $heap = {
        ...$heap,
        [elementId]: newElement
    };
    syncVDomToDom()
}

// Synchronises the current virtual DOM state contained in `$body` to `document.body`.
// This works by calculating the difference of `$body` between its state since the
// last time it was synchronised and its current state, this is done with the `compare`
// function. Then, for each difference, we mutate the native DOM with that difference.
function syncVDomToDom() {
    const diff = compare(1, $heapOfLastDomSync, 1, $heap);
    const actions = [];
    for (let i = 0; i < diff.length; i++) {
        const update = diff[i];
        actions.push(...mutateNativeDom(document.body, update));
    }
    for (let action of actions) {
        action();
    }
    $heapOfLastDomSync = $heap;

    function mutateNativeDom(element, update) {
        const { path, value } = update;
        if (path.length === 0) {
            throw new Error("Unexpected state, path elements should have been consumed.");
        }
        const [prop, ...restPath] = path;
        if (prop === "children") {
            if (restPath.length === 0) {
                if (update.type === "addition") {
                    const children = $heapAccess(value);
                    if (!Array.isArray(children)) {
                        throw new Error("Expected value to be an array");
                    }
                    const actions = [];
                    for (let i = 0; i < children.length; i++) {
                        actions.push(() => element.appendChild($vdomToNativeDom(children[i])));
                    }
                    return actions;
                } else if (update.type === "deletion") {
                    return [() => element.innerHTML = ""];
                }
            } else {
                const [idx, ...restRestPath] = restPath;
                if (restRestPath.length === 0) {
                    if (update.type === "deletion") {
                        if (element.childNodes[idx]) {
                            const childElement = element.childNodes[idx];
                            return [() => element.removeChild(childElement)];
                        } else {
                            throw new Error("Unhandled case");
                        }
                    } else if (update.type === "addition") {
                        return [() => element.insertBefore($vdomToNativeDom(value), element.childNodes[idx])];
                    } else if (update.type === "replacement") {
                        return [() => element.replaceChild($vdomToNativeDom(value), element.childNodes[idx])];
                    } else {
                        throw new Error("Unknown update type: " + update.type);
                    }
                } else {
                    return mutateNativeDom(element.childNodes[idx], {
                        type: update.type,
                        path: restRestPath,
                        value: value
                    });
                }
            }
        } else if (prop === "attrs") {
            if (restPath.length === 1) {
                const [prop] = restPath;
                return [() => $domSetAttrs(element, { [prop]: value })];
            } else if (restPath.length === 0) {
                return [() => $domSetAttrs(element, value)];
            } else {
                throw new Error("Attributes should not be nested deeper than 1 level as is the case with 'styles'.");
            }
        } else { // it's a number
            throw new Error("Not handling this case yet");
        }
    }
}

// Sets the attributes on a native DOM element. The second parameter `attrs` is assumed
// to be an object with attribute name/attribute value pairs, with the exception that
// if the attribute name is style, then the attribute value is assumed to be a nested
// object containing style name/style value pairs.
function $domSetAttrs(native, attrs) {
    if (attrs) {
        for (let key in attrs) {
            if (key === "style") {
                const styles = attrs.style;
                const styleStrings = [];
                for (let prop in styles) {
                    styleStrings.push(prop + ": " + styles[prop]);
                }
                native.setAttribute("style", styleStrings.join("; "));
            } else {
                native.setAttribute(key, attrs[key]);
            }
        }
    }
}

// Generates a Native DOM element out of a Virtual DOM element.
function $vdomToNativeDom(elementId) {
    const element = $heapAccess(elementId);
    if (typeof element === "string") {
        return document.createTextNode(element);
    } else {
        const native = document.createElement(element.tag);
        const attrs = $heapAccess(element.attrs);
        $domSetAttrs(native, attrs);
        const children = $heapAccess(element.children);
        if (children) {
            for (let i = 0; i < children.length; i++) {
                native.appendChild($vdomToNativeDom(children[i]));
            }
        }
        return native;
    }
}

// Deep compare of two objects within two different heaps. This is for
// the virtual DOM difference calculation.
function compare(source, heap1, destination, heap2) {
    return compareAt([], source, destination);

    function isObject(value) {
        const type = typeof value
        return value != null && (type === 'object' || type === 'function')
    }

    function difference(arr1, arr2) {
        const result = [];
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) === -1) {
                result.push(arr1[i]);
            }
        }
        return result;
    }

    function intersection(arr1, arr2) {
        const result = [];
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) !== -1) {
                result.push(arr1[i]);
            }
        }
        return result;
    }

    function heapAccess(id, heap) {
        if (typeof id === "string") {
            return id;
        }
        return heap[id];
    }

    function compareAt(path, source, destination) {
        if (isObject(heapAccess(source, heap1)) && isObject(heapAccess(destination, heap2))) {
            return compareObjectsAt(path, source, destination);
        } else {
            if (source === destination) {
                return [];
            } else {
                return [
                    {
                        type: "replacement",
                        path: path,
                        oldValue: source,
                        value: destination
                    }
                ];
            }
        }
    }

    function compareObjectsAt(path, source, destination) {
        source = heapAccess(source, heap1);
        destination = heapAccess(destination, heap2);
        const sourceKeys = Object.keys(source);
        const destinationKeys = Object.keys(destination);
        const sourceOnlyKeys = difference(sourceKeys, destinationKeys);
        const commonKeys = intersection(sourceKeys, destinationKeys);
        const destinationOnlyKeys = difference(destinationKeys, sourceKeys);
        const additions = destinationOnlyKeys.map((key) => ({
            type: "addition",
            path: [...path, key],
            value: destination[key]
        }));
        const removals = sourceOnlyKeys.map((key) => ({
            type: "deletion",
            path: [...path, key]
        }));

        const childDiffs = [];
        for (let i = 0; i < commonKeys.length; i++) {
            const key = commonKeys[i];
            const result = compareAt([...path, key], source[key], destination[key]);
            childDiffs.push(...result);
        }

        return [
            ...additions,
            ...removals,
            ...childDiffs
        ];
    }

}

// Time-Traveling Debugger UI
function createDebugUI() {
    // Debugger UI Container
    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.bottom = "0px";
    ui.style.left = "0px";
    ui.style.right = "0px";
    ui.style.height = "50%";
    ui.style.backgroundColor = "#ededed";
    ui.style.padding = "0.5em";
    ui.style.borderTop = "#888 solid 1px";

    // Prev Button
    const prevButton = document.createElement("button");
    prevButton.textContent = "←";//→
    prevButton.addEventListener("click", () => {
        if ($historyCursor - 1 >= 0) {
            $historyCursor = $historyCursor - 1;
            syncAll();
        }
    });
    ui.appendChild(prevButton);
    ui.appendChild(document.createTextNode(" "));

    // Progress label
    const progress = document.createElement("label");
    progress.style.fontFamily = "Helvetica, sans-serif";
    syncProgress();
    function syncProgress() {
        const total = $history.length;
        const current = $historyCursor + 1;
        const labelText = `Step ${current} of ${total}`;
        progress.textContent = labelText;
    }
    ui.appendChild(progress);
    ui.appendChild(document.createTextNode(" "));

    // Next Button
    const nextButton = document.createElement("button");
    nextButton.textContent = "→";
    nextButton.addEventListener("click", () => {
        if ($historyCursor + 1 < $history.length) {
            $historyCursor = $historyCursor + 1;
            syncAll();
        }
    });
    ui.appendChild(nextButton);
    ui.appendChild(document.createElement("br"));

    // Slider "Range" Element
    const range = document.createElement("input");
    range.style.width = "100%";
    range.type = "range";
    range.min = 1;
    syncRange();
    range.addEventListener("change", (e) => {
        $historyCursor = range.value - 1;
        syncAll();
    });
    function syncRange() {
        range.max = $history.length;
    }
    function syncRangeValue() {
        range.value = $historyCursor + 1;
    }
    ui.appendChild(range);

    // The 3-pane state display which includes the code pane, the
    // stack frame pane, and the heap pane
    const stateDisplay = document.createElement("div");
    stateDisplay.style.marginTop = "5px";
    stateDisplay.style.height = "250px";
    const codePane = document.createElement("pre");
    codePane.style.width = "33%";
    codePane.style.height = "100%";
    codePane.style.overflow = "auto";
    codePane.style.padding = "1em";
    codePane.style.backgroundColor = "#444";
    codePane.style.margin = "0px";
    codePane.style.color = "#ffffff";
    codePane.style.float = "left";

    function syncCodeDisplay() {
        const state = $history[$historyCursor];
        const lines = $code.split("\n");
        const linesDisplay = lines.map((line, idx) => {
            if (state.line === idx + 1) {
                return `<span style="background-color: yellow; color: black;">${line}</span>`;
            } else {
                return line;
            }
        }).join("\n");
        codePane.innerHTML = linesDisplay;
    }
    syncCodeDisplay();
    stateDisplay.appendChild(codePane);

    const stackFramePane = document.createElement("div");
    stackFramePane.style.width = "33%";
    stackFramePane.style.overflow = "auto";
    stackFramePane.style.height = "100%";
    stackFramePane.style.float = "left";
    stackFramePane.style.padding = "1em";
    stackFramePane.style.backgroundColor = "#dedede";
    function syncStackFrameDisplay() {
        const state = $history[$historyCursor];
        const html = state.stack.map((frame) => {
            const paramList = Object.keys(frame.parameters)
                .map(key => `${key}=${displayValue(frame.parameters[key])}`)
                .join(", ");
            const title = "<label>" + frame.funName + "(" + paramList + ")" + "</label>";
            const lines = [title, `<ul style="padding-left: 1em; margin: 0;">`];
            for (let varName in frame.variables) {
                lines.push(`<li style="list-style: none;">${varName} = ${displayValue(frame.variables[varName])}</li>`);
            }
            lines.push("</ul>");
            return lines.join("");
        }).join("");
        stackFramePane.innerHTML = html;
    }

    stateDisplay.appendChild(stackFramePane);
    const heapPane = document.createElement("div");
    heapPane.style.height = "100%";
    heapPane.style.width = "33%";
    heapPane.style.padding = "1em";
    heapPane.style.float = "left";
    heapPane.style.overflow = "auto";
    heapPane.style.backgroundColor = "#fdffe5";
    stateDisplay.appendChild(heapPane);

    function syncHeapDisplay() {
        const state = $history[$historyCursor];
        const htmlLines = [];
        for (let id in state.heap) {
            const object = state.heap[id];
            if (Array.isArray(object)) {
                htmlLines.push(renderArray(id, object));
            } else {
                htmlLines.push(renderDictionary(id, object));
            }
        }
        const html = htmlLines.join("");
        heapPane.innerHTML = html;
    }

    function renderArray(id, arr) {
        const table =
        `<table style="border-collapse: collapse; background-color: #fff;" border="1"><tr>${
            arr.map((item) => {
                return `<td>${displayValue(item)}</td>`
            }).join("")
        }</tr></table>`;
        return `<label>${id}: <label>` + table;
    }

    function renderDictionary(id, dict) {
        const table =
        `<table style="border-collapse: collapse; background-color: #fff;" border="1">${
            Object.keys(dict).map((key) => {
                return `<tr><td>${key}</td><td>${displayValue(dict[key])}</td></tr>`;
            }).join("")
        }</table>`;
        return `<label>${id}: <label>` + table;;
    }

    ui.appendChild(stateDisplay);

    syncAll();
    document.documentElement.appendChild(ui);

    function syncProgramState() {
        let state = $history[$historyCursor];
        $stack = state.stack;
        $heap = state.heap;
        $body = state.body;
    }

    function syncAll() {
        syncRangeValue();
        syncProgramState();
        syncStackFrameDisplay();
        syncCodeDisplay();
        syncHeapDisplay();
        syncProgress();
        syncVDomToDom();
    }

    function displayValue(value) {
        if (typeof value === "string") {
            return quote(value);
        } else {
            return String(value);
        }
    }

    function quote(str) {
        return '"' + str.replace(/\"/g, '\\"') + '"';
    }

}
