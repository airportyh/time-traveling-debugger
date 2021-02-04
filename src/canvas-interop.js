// Canvas

// let $body = $isBrowser && $nativeDomToVDom(document.body);
// let $heapOfLastDomSync = $heap;
let $canvas;
let $canvasContext;
let $canvasXY;


if ($isBrowser) {
    $initStyles();
    $initCanvas();
}

function $initStyles() {
    const stylesText = `
    * {
        box-sizing: border-box;
    }
    
    body {
        margin: 0;
        padding: 0;
    }
    
    #canvas {
        border: 1px solid black;
        margin: 0;
    }
    
    #canvas-xy {
        font-family: Helvetica, sans-serif;
    }
    
    .current-line {
        background-color: yellow;
        color: black;
    }
    
    .heap-id {
        color: blue;
    }
    
    .heap-object {
        margin-right: 5px;
        margin-bottom: 5px;
    }
    
    .heap-object td {
        padding: 2px;
    }
    
    .error-message {
        color: #e35e54;
        font-family: Helvetica, sans-serif;
    }
    
    .code-line {
        padding: 0 1em;
    }
    
    .stack-frame {
    }
    
    .stack-frame label {
        display: block;
        background-color: gray;
        color: white;
        padding: 0 1em;
    }
    `;
    const style = document.createElement("style");
    style.textContent = stylesText;
    document.body.appendChild(style);
}

function $initCanvas() {
    $canvas = document.getElementById("canvas");
    if ($canvas) {
        $canvasContext = $canvas.getContext("2d");
        $canvasContext.textBaseline = "top";
        $canvasContext.textBaseLine = "top";
        $canvasXY = document.getElementById("canvas-xy");
        $canvas.addEventListener("mousemove", (e) => {
            $canvasXY.textContent = 
                `x = ${e.offsetX.toFixed(0)}   y = ${e.offsetY.toFixed(0)}`;
        });
    }
}

// interop functions

function fillRect(x, y, width, height) {
    $canvasContext.fillRect(x, y, width, height);
}
fillRect = $interop(fillRect);

function fillCircle(x, y, radius) {
    $canvasContext.beginPath();
    $canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
    $canvasContext.fill();
}
fillCircle = $interop(fillCircle);

function drawLine(x1, y1, x2, y2) {
    $canvasContext.beginPath();
    $canvasContext.moveTo(x1, y1);
    $canvasContext.lineTo(x2, y2);
    $canvasContext.stroke(); 
}
drawLine = $interop(drawLine);

function setFont(font) {
    $canvasContext.font = font;
}
setFont = $interop(setFont);

function fillText(text, x, y) {
    $canvasContext.fillText(text, x, y);
}
fillText = $interop(fillText);

function setLineWidth(width) {
    $canvasContext.lineWidth = width;
}
setLineWidth = $interop(setLineWidth);

function setLineColor(color) {
    $canvasContext.strokeStyle = color;
}
setLineColor = $interop(setLineColor);

function clear() {
    $canvasContext.clearRect(0, 0, $canvas.width, $canvas.height);
}
clear = $interop(clear, true);

function drawText(text, x, y) {
    $canvasContext.fillText(text, x, y);
}
drawText = $interop(drawText);

function setColor(color) {
    $canvasContext.fillStyle = color;
}
setColor = $interop(setColor);

function setLineCap(lineCap) {
    $canvasContext.lineCap = lineCap;
}
setLineCap = $interop(setLineCap);

function drawArc(x, y, radius, startDegree, endDegree) {
    $canvasContext.beginPath();
    startRadian = (startDegree - 90) / 180 * Math.PI;
    endRadian = (endDegree - 90) / 180 * Math.PI;
    $canvasContext.arc(x, y, radius, startRadian, endRadian);
    $canvasContext.stroke();
}
drawArc = $interop(drawArc);

function $interop(fun, reset) {
    const ret = function(...args) {
        const result = fun(...args);
        const entry = {
            type: "interop",
            fun: fun.name,
            arguments: args
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
