// VDOM functionality temporarily disabled
const $nativeToVirtualDomMap = new WeakMap();
const $virtualDomToNativeMap = new Map();


// ==  Virtual DOM temporarily disabled ==

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