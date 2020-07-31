// Runtime functions
const $nativeToVirtualDomMap = new WeakMap();
const $virtualDomToNativeMap = new Map();
const $isBrowser = typeof document !== "undefined";
const $history = [];
let $historyCursor = -1;
let $stack = [];
let $nextHeapId = 1;
let $heap = {};
let $interops = [];
let $halted = false;
let $errorMessage = null;
// let $body = $isBrowser && $nativeDomToVDom(document.body);
let $heapOfLastDomSync = $heap;
let $canvas = document.getElementById("canvas");
let $canvasContext = $canvas.getContext("2d");
$canvasContext.textBaseline = "top";

function $pushFrame(funName, variables, closures) {
    const newFrame = { funName, parameters: variables, variables };
    if (closures) {
        newFrame.closures = closures;
    }
    $stack = [...$stack, newFrame];
}

function $popFrame() {
    $stack = $stack.slice(0, $stack.length - 1);
}

function $getVariable(varName) {
    const variables = $stack[$stack.length - 1].variables;
    if (varName in variables) {
        return variables[varName];
    } else {
        $errorMessage = `Reference to undefined variable ${varName} encountered.`;
        alert($errorMessage);
        $halted = true;
        throw new Error($errorMessage);
    }
}

function $setVariable(varName, value) {
    const frame = $stack[$stack.length - 1];
    const newFrame = {
        ...frame,
        variables: { ...frame.variables, [varName]: value }
    };
    $stack = [...$stack.slice(0, $stack.length - 1), newFrame];
}

function $getHeapVariable(varName, closureId) {
    const dict = $heapAccess(closureId);
    return dict[varName];
}

function $setHeapVariable(varName, value, closureId) {
    const dict = $heapAccess(closureId);
    const newDict = {
        ...dict,
        [varName]: value
    };
    $heap[closureId] = newDict;
}

function $isHeapRef(thing) {
    return typeof thing === "object" && typeof thing.id === "number";
}

function $heapAllocate(value) {
    const id = $nextHeapId;
    $nextHeapId++;
    $heap = {
        ...$heap,
        [id]: value
    };
    return { id };
}

function $save(line) {
    const entry = {
        line, 
        stack: $stack, 
        heap: $heap
    };
    if ($interops.length > 0) {
        entry.interops = $interops;
    }
    $history.push(entry);
    $interops = [];
    $historyCursor++;
}

function $heapAccess(thing) {
    if ($isHeapRef(thing)) {
        return $heap[thing.id];
    } else {
        return thing;
    }
}

function $get(thing, index) {
    return $heapAccess(thing)[index];
}

function $set(thing, index, value) {
    let object;
    let newObject;
    if ($isHeapRef(thing)) {
        object = $heap[thing.id];
    } else {
        object = thing;
    }
    if (Array.isArray(object)) {
        newObject = object.slice();
        newObject[index] = value;
    } else {
        newObject = {
            ...object,
            [index]: value
        };
    }
    $heap = {
        ...$heap,
        [thing.id]: newObject
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
        () => console.log(`Wrote ${filePath}.`)
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

function pop(thing) {
    if ($isHeapRef(thing)) {
        return $heapAllocate($heap[thing.id].pop());
    } else {
        throw new Error("Cannot pop() for a " + (typeof thing));
    }
}

function push(thing, item) {
    if ($isHeapRef(thing)) {
        const array = $heap[thing.id];
        const newArray = [...array, item];
        $heap = {
            ...$heap,
            [thing.id]: newArray
        };
        return newArray.length;
    } else {
        throw new Error("Cannot push() for a " + (typeof thing));
    }
}

function concat(one, other) {
    if ($isHeapRef(one) && $isHeapRef(other)) {
        const one = $heap[one.id];
        const other = $heap[other.id];
        return $heapAllocate(one.concat(other));
    } else {
        throw new Error("Cannot concat() a " + (typeof one) + " and a " + (typeof other));
    }
}

function map(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return $heapAllocate(arr.map(fn));
    } else {
        throw new Error("Cannot map() for a " + (typeof thing));
    }
}

function filter(fn, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return $heapAllocate(arr.filter(fn));
    } else {
        throw new Error("Cannot filter() for a " + (typeof thing));
    }
}

function reduce(fn, initValue, thing) {
    if ($isHeapRef(thing)) {
        const arr = $heap[thing.id];
        return arr.reduce(fn, initValue);
    } else {
        throw new Error("Cannot reduce() for a " + (typeof thing));
    }
}

function count(thing) {
    return $heapAccess(thing).length;
}

function sqrt(num) {
    return Math.sqrt(num);
}

function sqr(num) {
    return num * num;
}

function join(thing, separator) {
    if ($isHeapRef(thing)) {
        const array = $heap[thing.id];
        return array.join(separator);
    } else {
        throw new Error("Cannot join() for a " + (typeof thing));
    }
}

function floor(num) {
    return Math.floor(num);
}

function getElementById(id) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return document.getElementById(id);
}

function addStyle(element, stylesId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const styles = $heap[stylesId];
    for (let prop in styles) {
        element.style[prop] = styles[prop];
    }
}

function createElement(tag, attrs, children) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
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
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return $body;
}

function appendTo(parentId, childId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
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

function removeFrom(parentId, childId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const parent = $heapAccess(parentId);
    const children = $heapAccess(parent.children) || [];
    const newChildren = $heapAllocate(children.filter((child) => child !== childId));
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
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
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

function setAttribute(elementId, attrName, attrValue) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $heapAccess(elementId);
    const attrs = $heapAccess(element.attrs);
    const newAttrs = $heapAllocate({
        ...attrs,
        [attrName]: attrValue
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

function setStyle(elementId, stylesId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
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

function listenTo(elementId, event, listener) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    document.body.addEventListener(event, (event) => {
        const targetId = $nativeToVirtualDomMap.get(event.target);
        if (targetId === elementId) {
            listener(event);
        }
    });
}

function getKey(keyEvent) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    return keyEvent.key;
}

function getValue(inputId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.value;
}

function setValue(inputId, value) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    input.value = value;
}

function getChecked(inputId) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.checked;
}

function setChecked(inputId, checked) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const input = $virtualDomToNativeMap.get(inputId);
    return input.checked = checked;
}

function addClass(elementId, clazz) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $virtualDomToNativeMap.get(elementId);
    element.classList.add(clazz);
}

function removeClass(elementId, clazz) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
    const element = $virtualDomToNativeMap.get(elementId);
    element.classList.remove(clazz);
}

function $nativeDomToVDom(node) {
    throw new Error("DOM and VDOM functions are likely broken do the heap object update.");
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
        $virtualDomToNativeMap.set(elementId, node);
        $nativeToVirtualDomMap.set(node, elementId);
        return elementId;
    } else if (node.nodeType === Node.TEXT_NODE) {
        return node.data;
    } else {
        throw new Error("Unsupported node type: " + node.nodeType);
    }
}

// Generates a Native DOM element out of a Virtual DOM element.
function $vdomToNativeDom(elementId) {
    const element = $heapAccess(elementId);
    if (typeof element === "string") {
        const retval = document.createTextNode(element);
        return retval;
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
        $virtualDomToNativeMap.set(elementId, native);
        $nativeToVirtualDomMap.set(native, elementId);
        return native;
    }
}

// Synchronises the current virtual DOM state contained in `$body` to `document.body`.
// This works by calculating the difference of `$body` between its state since the
// last time it was synchronised and its current state, this is done with the `compare`
// function. Then, for each difference, we mutate the native DOM with that difference.
function syncVDomToDom() {
    const diff = compare(1, $heapOfLastDomSync, 1, $heap);
    const mutations = [];
    for (let i = 0; i < diff.length; i++) {
        const update = diff[i];
        mutations.push(...collectNativeDomMutations(document.body, update));
    }
    for (let action of mutations) {
        action();
    }
    $heapOfLastDomSync = $heap;

    function collectNativeDomMutations(element, update) {
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
                    return children.map(
                        (child) =>
                            () =>
                                element.appendChild($vdomToNativeDom(child))
                    );
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
                    return collectNativeDomMutations(element.childNodes[idx], {
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
async function sleep(ms) {
    return new Promise((accept) => {
        setTimeout(() => accept(), ms);
    });
}

// Canvas


// interop functions

function fillRect(x, y, width, height) {
    $canvasContext.fillRect(x, y, width, height);
}
fillRect = $interop(fillRect);

function clear() {
    $canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);
}
clear = $interop(clear, true);

function drawText(text, x, y) {
    $canvasContext.fillText(text, x, y);
}
drawText = $interop(drawText);

function setFont(font) {
    $canvasContext.font = font;
}
setFont = $interop(setFont);

function setColor(color) {
    $canvasContext.fillStyle = color;
}
setColor = $interop(setColor);

function $interop(fun, reset) {
    const ret = function(...args) {
        const result = fun(...args);
        const entry = {
            type: "interop",
            fun: fun.name,
            arguments: args,
            result
        };
        if (reset) {
            entry.reset = reset;
        }
        $interops.push(entry);
        return result;
    };
    ret.original = fun;
    return ret;
}

async function waitForEvent(eventName) {
    return new Promise((accept) => {
        const callback = (event) => {
            $canvas.removeEventListener(eventName, callback);
            const eventObject = $heapAllocate({
                type: event.type,
                x: event.x,
                y: event.y
            });
            accept(eventObject);
        };
        $canvas.addEventListener(eventName, callback);
    });
}

function createDebugButton() {
    const button = document.createElement("button");
    button.textContent = "Debug";
    button.style.position = "fixed";
    button.style.bottom = "5px";
    button.style.right = "5px";
    button.addEventListener("click", () => {
        document.documentElement.removeChild(button);
        createDebugUI();
    });
    document.documentElement.appendChild(button);
}

function createDebugUI() {
    document.body.style.pointerEvents = "none";
    document.body.style.userSelect = "none";
    // Debugger UI Container
    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.bottom = "0px";
    ui.style.top = "0px";
    ui.style.left = "50%";
    ui.style.right = "0px";
    ui.style.height = "100%";
    ui.style.backgroundColor = "#ededed";
    ui.style.padding = "0.5em";
    ui.style.borderTop = "#888 solid 1px";
    
    // Close Button
    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.position = "absolute";
    closeButton.style.right = "5px";
    closeButton.addEventListener("click", async () => {
        $historyCursor = $history.length - 1;
        syncAll();
        await sleep(100);
        document.documentElement.removeChild(ui);
        createDebugButton();
        document.body.style.pointerEvents = "inherit";
        document.body.style.userSelect = "inherit";
    });
    ui.appendChild(closeButton);

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
    const advance = () => {
        if ($historyCursor + 1 < $history.length) {
            $historyCursor = $historyCursor + 1;
            syncAll();
        }
    };
    nextButton.addEventListener("click", advance);
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
    
    // Error Message
    if ($errorMessage) {
        const errorLabel = document.createElement("div");
        errorLabel.className = "error-message";
        errorLabel.textContent = $errorMessage;
        ui.appendChild(errorLabel);
    }

    // The 3-pane state display which includes the code pane, the
    // stack frame pane, and the heap pane
    const stateDisplay = document.createElement("div");
    stateDisplay.style.marginTop = "5px";
    stateDisplay.style.height = "90%";
    const codePane = document.createElement("pre");
    codePane.style.position = "relative";
    codePane.style.height = "30%";
    codePane.style.overflow = "auto";
    codePane.style.padding = "0px";
    codePane.style.backgroundColor = "#444";
    codePane.style.margin = "0px";
    codePane.style.color = "#ffffff";
    codePane.style.fontFamily = "Inconsolata, Monaco, monospace";

    function initCodeDisplay() {
        const lines = $code.split("\n");
        const linesDisplay = lines.map((line, idx) => {
            return `<div>${line}</div>`;
        }).join("");
        codePane.innerHTML = linesDisplay;
    }

    function syncCodeDisplay() {
        const prevLine = codePane.querySelector(".current-line");
        if (prevLine) {
            prevLine.classList.remove("current-line");
        }
        const state = $history[$historyCursor];
        const currentLine = codePane.children[state.line - 1];
        currentLine.classList.add("current-line");
        
        // scroll into view if needed
        const top = currentLine.offsetTop;
        const height = currentLine.offsetHeight;
        const scrollTop = codePane.scrollTop;
        const parentHeight = codePane.offsetHeight;
        if (top < scrollTop || top + height > scrollTop + parentHeight) {
            codePane.scrollTop = top - parentHeight / 2 + height / 2;
        }
    }
    initCodeDisplay();
    stateDisplay.appendChild(codePane);
    setTimeout(syncCodeDisplay, 0);
    
    const stackFramePane = document.createElement("div");
    stackFramePane.style.overflow = "auto";
    stackFramePane.style.height = "30%";
    stackFramePane.style.padding = "1em";
    stackFramePane.style.backgroundColor = "#d1ebeb";
    stackFramePane.style.fontFamily = "Inconsolata, Monaco, monospace";
    function syncStackFrameDisplay() {
        const state = $history[$historyCursor];
        const html = state.stack.slice().reverse().map((frame) => {
            const paramList = Object.keys(frame.parameters)
                .map(key => `${key}=${displayValue(frame.parameters[key])}`)
                .join(", ");
            const title = "<label>" + frame.funName + "(" + paramList + ")" + "</label>";
            const lines = [title, `<ul style="padding-left: 1em; margin: 0;">`];
            for (let varName in frame.variables) {
                lines.push(`<li style="list-style: none;">${escapeVarName(varName)} = ${displayValue(frame.variables[varName])}</li>`);
            }
            if (frame.closures) {
                for (let closure of frame.closures) {
                    const vars = $heapAccess(closure);
                    for (let varName in vars) {
                        lines.push(`<li style="list-style: none;">${escapeVarName(varName)} = ${displayValue(vars[varName])}</li>`);
                    }
                }
            }
            lines.push("</ul>");
            return lines.join("");
        }).join("");
        stackFramePane.innerHTML = html;
    }
    
    function escapeVarName(varName) {
        return varName.replace(/>/g, "&gt;").replace(/</g, "&lt;");
    }

    stateDisplay.appendChild(stackFramePane);
    const heapPane = document.createElement("div");
    heapPane.style.height = "30%";
    heapPane.style.padding = "1em";
    heapPane.style.overflow = "auto";
    heapPane.style.backgroundColor = "#fdffe5";
    heapPane.style.display = "flex";
    heapPane.style.flexWrap = "wrap";
    heapPane.style.fontFamily = "Inconsolata, Monaco, monospace";
    stateDisplay.appendChild(heapPane);

    function syncHeapDisplay() {
        const state = $history[$historyCursor];
        
        // Sort of like a mark and sweep algorithm to
        // filter out unreferenced heap objects and
        // also prioritize ones that are referenced
        // higher up in the stack frame
        const markings = new Map();
        for (let i = 0; i < state.stack.length; i++) {
            const frame = state.stack[i];
            for (let varName in frame.variables) {
                const value = frame.variables[varName];
                if ($isHeapRef(value)) {
                    traverse(value, i);
                }
            }
        }
        
        function traverse(ref, priority) {
            const object = $heap[ref.id];
            if (markings.has(ref.id)) {
                const prevPriority = markings.get(ref.id);
                if (priority > prevPriority) {
                    markings.set(ref.id, priority);
                } else {
                    return;
                }
            } else {
                markings.set(ref.id, priority);
            }
            if (Array.isArray(object)) {
                traverseArray(object, priority);
            } else {
                traverseDictionary(object, priority);
            }
        }
        
        function traverseArray(array, priority) {
            for (let item of array) {
                if ($isHeapRef(item)) {
                    traverse(item, priority);
                }
            }
        }
        
        function traverseDictionary(object, priority) {
            for (let key in object) {
                const value = object[key];
                if ($isHeapRef(value)) {
                    traverse(value, priority);
                }
            }
        }
        
        const entries = Array.from(markings.entries());
        entries.sort((one, other) => other[1] - one[1]);
        const ids = entries.map(entry => entry[0]);
        
        const htmlLines = [];
        for (let id of ids) {
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
        return `<div class="heap-object"><label><span class="heap-id">${id}</span>: <label>${table}</div>`;
    }

    function renderDictionary(id, dict) {
        const table =
        `<table style="border-collapse: collapse; background-color: #fff;" border="1">${
            Object.keys(dict).map((key) => {
                return `<tr><td>${key}</td><td>${displayValue(dict[key])}</td></tr>`;
            }).join("")
        }</table>`;
        return `<div class="heap-object"><label><span class="heap-id">${id}</span>: <label>${table}</div>`;
    }

    ui.appendChild(stateDisplay);

    syncAll();
    document.documentElement.appendChild(ui);

    function syncProgramState() {
        let state = $history[$historyCursor];
        $stack = state.stack;
        $heap = state.heap;
        //$body = state.body;
    }
    
    function syncCanvas() {
        let state = $history[$historyCursor];
        
        // redo interops starting from the beginning or
        // last interop where reset is true
        
        const interops = [];
        let index = $historyCursor;
        let seeking = true;
        while (seeking) {
            const state = $history[index];
            if (state.interops) {
                for (let i = state.interops.length - 1; i >= 0; i--) {
                    const interop = state.interops[i];
                    interops.unshift(interop);
                    if (interop.reset) {
                        // done
                        seeking = false;
                        break;
                    }
                }
            }
            index--;
            if (index < 0) {
                break;
            }
        }
        for (let interop of interops) {
            const fun = window[interop.fun].original;
            fun(...interop.arguments);
        }
    }

    function syncAll() {
        syncRangeValue();
        syncProgramState();
        syncStackFrameDisplay();
        syncCodeDisplay();
        syncHeapDisplay();
        syncProgress();
        syncCanvas();
        //syncVDomToDom();
    }

    function displayValue(value) {
        if ($isHeapRef(value)) {
            return `<span class="heap-id">${value.id}</span>`;
        } else if (typeof value === "string") {
            return quote(value);
        } else {
            return String(value);
        }
    }

    function quote(str) {
        return '"' + str.replace(/\"/g, '\\"') + '"';
    }

}
