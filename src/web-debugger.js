
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
    let destroyCurrentDebugger;
    
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
    
    const rightButtons = document.createElement("div");
    rightButtons.style.position = "absolute";
    rightButtons.style.right = "5px";
    rightButtons.style.zIndex = "1";
    ui.appendChild(rightButtons);
    
    let zoomMode = false;
    // Zoom Button
    const zoomToggleButton = document.createElement("button");
    zoomToggleButton.textContent = "Zoom";
    zoomToggleButton.addEventListener("click", () => {
        if (zoomMode) {    
            destroyCurrentDebugger();
            destroyCurrentDebugger = createStepDebuggerUi(ui);
            zoomMode = false;
            zoomToggleButton.textContent = "Zoom";
        } else {
            destroyCurrentDebugger();
            destroyCurrentDebugger = createZoomDebuggerUi(ui);
            zoomMode = true;
            zoomToggleButton.textContent = "Step";
        }
        
    });
    rightButtons.appendChild(zoomToggleButton);
    
    // Close Button
    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", async () => {
        destroyCurrentDebugger();
        //$historyCursor = $history.length - 1;
        //syncAll();
        await sleep(100);
        document.documentElement.removeChild(ui);
        createDebugButton();
        document.body.style.pointerEvents = "inherit";
        document.body.style.userSelect = "inherit";
    });
    rightButtons.appendChild(closeButton);
    
    
    document.documentElement.appendChild(ui);
    setTimeout(() => {
        destroyCurrentDebugger = createStepDebuggerUi(ui);
    }, 0);
}

function createZoomDebuggerUi(ui) {
    const panel = document.createElement("div");
    panel.style.height = "100%";
    panel.style.width = "100%";
    ui.appendChild(panel);
    ZoomDebugger.initZoomDebugger(panel, $code, $history);
    return destroy;
    
    function destroy() {
        ui.removeChild(panel);
    }
}

function createStepDebuggerUi(ui) {
    
    let buttonBar;
    let progress;
    initButtonBar();
    let timeSlider;
    initTimeSlider();
    
    maybeDisplayErrorMessage();
    
    let codePane;
    initCodePane();
    
    let stackFramePane;
    initStackFramePane();
    
    let heapPane;
    initHeapPane();

    syncAll();
    
    return destroy;
    
    function destroy() {
        // Check if these DOM elements are no longer referenced
        $historyCursor = $history.length - 1;
        syncAll();
        ui.removeChild(buttonBar);
        ui.removeChild(timeSlider);
        ui.removeChild(codePane);
        ui.removeChild(stackFramePane);
        ui.removeChild(heapPane);
    }
    
    function initButtonBar() {
        buttonBar = document.createElement("div");
        ui.appendChild(buttonBar);
        // Prev Buttons
        const prevOutButton = document.createElement("button");
        prevOutButton.textContent = "⇤";
        prevOutButton.addEventListener("click", () => {
            const state = $history[$historyCursor];
            // find next state where the stack height is the same or less
            let cursor = $historyCursor - 1;
            while (true) {
                const prevState = $history[cursor];
                if (prevState) {
                    if (prevState.stack.length < state.stack.length) {
                        $historyCursor = cursor;
                        syncAll();
                        break;
                    }
                } else {
                    break;
                }
                cursor--;
            }
        });
        buttonBar.appendChild(prevOutButton);
        
        const prevIntoButton = document.createElement("button");
        prevIntoButton.textContent = "↖";
        prevIntoButton.addEventListener("click", () => {
            if ($historyCursor - 1 >= 0) {
                $historyCursor = $historyCursor - 1;
                syncAll();
            }
        });
        buttonBar.appendChild(prevIntoButton);
        
        const prevOverButton = document.createElement("button");
        prevOverButton.textContent = "←";
        prevOverButton.addEventListener("click", () => {
            const state = $history[$historyCursor];
            const prevState = $history[$historyCursor - 1];
            if (prevState && prevState.stack.length > state.stack.length) {
                // find next state where the stack height is the same or less
                let cursor = $historyCursor - 1;
                while (true) {
                    const prevState = $history[cursor];
                    if (prevState) {
                        if (prevState.stack.length <= state.stack.length && prevState.line !== state.line) {
                            $historyCursor = cursor;
                            syncAll();
                            break;
                        }
                    } else {
                        break;
                    }
                    cursor--;
                }
            } else {
                if ($historyCursor - 1 >= 0) {
                    $historyCursor = $historyCursor - 1;
                    syncAll();
                }
            }
        });
        buttonBar.appendChild(prevOverButton);
        buttonBar.appendChild(document.createTextNode(" "));


        // Next Buttons
        const nextOverButton = document.createElement("button");
        nextOverButton.textContent = "→";
        nextOverButton.addEventListener("click", () => {
            const state = $history[$historyCursor];
            const nextState = $history[$historyCursor + 1];
            if (nextState && nextState.stack.length > state.stack.length) {
                // find next state where the stack height is the same or less
                let cursor = $historyCursor + 1;
                while (true) {
                    const nextState = $history[cursor];
                    if (nextState) {
                        if (nextState.stack.length <= state.stack.length && nextState.line !== state.line) {
                            $historyCursor = cursor;
                            syncAll();
                            break;
                        }
                    } else {
                        break;
                    }
                    cursor++;
                }
            } else {
                if ($historyCursor + 1 < $history.length) {
                    $historyCursor = $historyCursor + 1;
                    syncAll();
                }
            }
        });
        buttonBar.appendChild(nextOverButton);
        
        const nextIntoButton = document.createElement("button");
        nextIntoButton.textContent = "↘";
        nextIntoButton.addEventListener("click", () => {
            if ($historyCursor + 1 < $history.length) {
                $historyCursor = $historyCursor + 1;
                syncAll();
            }
        });
        buttonBar.appendChild(nextIntoButton);
        
        const nextOutButton = document.createElement("button");
        nextOutButton.textContent = "⇥";
        nextOutButton.addEventListener("click", () => {
            const state = $history[$historyCursor];
            // find next state where the stack height is the same or less
            let cursor = $historyCursor + 1;
            while (true) {
                const nextState = $history[cursor];
                if (nextState) {
                    if (nextState.stack.length < state.stack.length) {
                        $historyCursor = cursor;
                        syncAll();
                        break;
                    }
                } else {
                    break;
                }
                cursor++;
            }
        });
        buttonBar.appendChild(nextOutButton);
        
        // Progress label
        buttonBar.appendChild(document.createTextNode(" "));
        progress = document.createElement("label");
        progress.style.fontFamily = "Helvetica, sans-serif";
        syncProgress();
        
        buttonBar.appendChild(progress);
        buttonBar.appendChild(document.createTextNode(" "));
    }
    
    function syncProgress() {
        const total = $history.length;
        const current = $historyCursor + 1;
        const labelText = `Step ${current} of ${total}`;
        progress.textContent = labelText;
    }
    
    function initTimeSlider() {
        timeSlider = document.createElement("input");
        timeSlider.style.width = "100%";
        timeSlider.type = "range";
        timeSlider.min = 1;
        
        syncTimeSlider();
        
        timeSlider.addEventListener("change", (e) => {
            $historyCursor = timeSlider.value - 1;
            syncAll();
        });
        
        ui.appendChild(timeSlider);
    }
    
    function maybeDisplayErrorMessage() {
        // Error Message
        if ($errorMessage) {
            const errorLabel = document.createElement("div");
            errorLabel.className = "error-message";
            errorLabel.textContent = $errorMessage;
            ui.appendChild(errorLabel);
        }
    }
    
    function syncTimeSlider() {
        if (timeSlider.max !== $history.length) {
            timeSlider.max = $history.length;
        }
        timeSlider.value = $historyCursor + 1;
    }
    
    function initCodePane() {
        codePane = document.createElement("pre");
        codePane.style.margin = "5px 0px 0px 0px";
        codePane.style.position = "relative";
        codePane.style.height = "30%";
        codePane.style.overflow = "auto";
        codePane.style.padding = "1em 0px";
        codePane.style.backgroundColor = "#444";
        codePane.style.color = "#ffffff";
        codePane.style.fontFamily = "Inconsolata, Monaco, monospace";
        
        initCodeDisplay();
        ui.appendChild(codePane);
        setTimeout(syncCodeDisplay, 0);
    }

    function initCodeDisplay() {
        const lines = $code.split("\n");
        const linesDisplay = lines.map((line, idx) => {
            return `<div class="code-line">${line}</div>`;
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
    
    function initStackFramePane() {
        stackFramePane = document.createElement("div");
        stackFramePane.style.overflow = "auto";
        stackFramePane.style.height = "30%";
        stackFramePane.style.borderTop = "1px solid #eee";
        stackFramePane.style.backgroundColor = "#d1ebeb";
        stackFramePane.style.fontFamily = "Inconsolata, Monaco, monospace";
        
        ui.appendChild(stackFramePane);
    }
    
    function syncStackFrameDisplay() {
        const state = $history[$historyCursor];
        const html = state.stack.slice().reverse().map((frame) => {
            const paramList = Object.keys(frame.parameters)
                .map(key => `${key}=${displayValue(frame.parameters[key])}`)
                .join(", ");
            const title = "<label>" + frame.funName + "(" + paramList + ")" + "</label>";
            const lines = [
                `<div class="stack-frame">`,
                title, `<ul style="padding-left: 1em; margin: 0;">`
            ];
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
            lines.push("</div>");
            return lines.join("");
        }).join("");
        stackFramePane.innerHTML = html;
    }
    
    function escapeVarName(varName) {
        return varName.replace(/>/g, "&gt;").replace(/</g, "&lt;");
    }
    
    function initHeapPane() {
        heapPane = document.createElement("div");
        heapPane.style.height = "30%";
        heapPane.style.padding = "1em";
        heapPane.style.overflow = "auto";
        heapPane.style.backgroundColor = "#fdffe5";
        heapPane.style.display = "flex";
        heapPane.style.flexWrap = "wrap";
        heapPane.style.fontFamily = "Inconsolata, Monaco, monospace";
        ui.appendChild(heapPane);
    }

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
        syncTimeSlider();
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
