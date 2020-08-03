var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (undefined && undefined.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __spread = (undefined && undefined.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var jsonr = require("@airportyh/jsonr");
var parser_1 = require("../parser");
var fit_box_1 = require("./fit-box");
var code_scope_renderer_1 = require("./code-scope-renderer");
var CANVAS_WIDTH = window.innerWidth * 2;
var CANVAS_HEIGHT = window.innerHeight * 2;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        function requestRender() {
            requestAnimationFrame(render);
        }
        function entirelyContainsViewport(bbox) {
            return bbox.x <= 0 && bbox.y <= 0 &&
                (bbox.x + bbox.width > CANVAS_WIDTH) &&
                (bbox.y + bbox.height > CANVAS_HEIGHT);
        }
        function renderZoomRenderable(renderable, bbox, ancestry) {
            var e_1, _a;
            var viewportBBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
            var childRenderables = renderable.render(ctx, bbox, viewportBBox);
            var childEnclosingRenderable = null;
            var myScope = {
                bbox: boxCanvasToWorld(bbox),
                renderable: renderable
            };
            try {
                for (var _b = __values(childRenderables.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), childBBox = _d[0], renderable_1 = _d[1];
                    var result = renderZoomRenderable(renderable_1, childBBox, __spread([myScope], ancestry));
                    if (result) {
                        childEnclosingRenderable = result;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (childEnclosingRenderable) {
                return childEnclosingRenderable;
            }
            else {
                if (entirelyContainsViewport(bbox)) {
                    return __spread([myScope], ancestry);
                }
                else {
                    return null;
                }
            }
        }
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var currentScope = currentScopeChain[0];
            var bBox = boxWorldToCanvas(currentScope.bbox);
            var enclosingScopeChain = renderZoomRenderable(currentScope.renderable, bBox, currentScopeChain.slice(1));
            if (enclosingScopeChain) {
                currentScopeChain = enclosingScopeChain;
            }
            else {
                if (currentScopeChain.length > 1) {
                    currentScopeChain = currentScopeChain.slice(1);
                }
                else {
                    currentScopeChain = [mainScope];
                }
            }
        }
        function pointScreenToCanvas(e) {
            return [
                (e.clientX - canvas.offsetLeft - 1) * 2,
                (e.clientY - canvas.offsetTop - 1) * 2
            ];
        }
        function pointCanvasToWorld(x, y) {
            return [
                x / viewport.zoom + viewport.left,
                y / viewport.zoom + viewport.top
            ];
        }
        function boxWorldToCanvas(box) {
            return {
                y: (box.y - viewport.top) * viewport.zoom,
                x: (box.x - viewport.left) * viewport.zoom,
                width: box.width * viewport.zoom,
                height: box.height * viewport.zoom
            };
        }
        function boxCanvasToWorld(box) {
            return {
                y: (box.y / viewport.zoom) + viewport.top,
                x: (box.x / viewport.zoom) + viewport.left,
                width: box.width / viewport.zoom,
                height: box.height / viewport.zoom
            };
        }
        var dragging, dragStartX, dragStartY, canvas, log, viewport, ctx, code, ast, historyText, history, textMeasurer, mainScope, currentScopeChain;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    document.body.style.margin = "0";
                    document.body.style.padding = "0";
                    dragging = false;
                    canvas = document.createElement("canvas");
                    log = document.createElement("pre");
                    log.style.position = "absolute";
                    log.style.bottom = "1px";
                    canvas.width = CANVAS_WIDTH;
                    canvas.height = CANVAS_HEIGHT;
                    canvas.style.border = "1px solid black";
                    canvas.style.transform = "scale(0.5) translate(-" + canvas.width / 2 + "px, -" + canvas.height / 2 + "px)";
                    viewport = {
                        top: -canvas.height / 2,
                        left: -canvas.width / 2,
                        zoom: 0.5
                    };
                    ctx = canvas.getContext("2d");
                    document.body.appendChild(canvas);
                    document.body.appendChild(log);
                    return [4 /*yield*/, fetchText("nested-data.play")];
                case 1:
                    code = _a.sent();
                    ast = parser_1.parse(code);
                    return [4 /*yield*/, fetchText("nested-data.history")];
                case 2:
                    historyText = _a.sent();
                    history = jsonr.parse(historyText);
                    ctx.textBaseline = "top";
                    textMeasurer = new fit_box_1.TextMeasurer(ctx, true);
                    mainScope = {
                        bbox: {
                            y: 0,
                            x: 0,
                            width: canvas.width,
                            height: canvas.height
                        },
                        renderable: new code_scope_renderer_1.CodeScopeRenderer(history, "main()", ast, code, textMeasurer)
                    };
                    currentScopeChain = [mainScope];
                    // Scope chain looks like [inner most, middle scope, outer most]
                    requestRender();
                    window.addEventListener("mousedown", function (e) {
                        var _a;
                        dragging = true;
                        _a = __read(pointScreenToCanvas(e), 2), dragStartX = _a[0], dragStartY = _a[1];
                    });
                    window.addEventListener("mouseup", function () {
                        dragging = false;
                    });
                    window.addEventListener("mousemove", function (e) {
                        if (dragging) {
                            var _a = __read(pointScreenToCanvas(e), 2), pointerX = _a[0], pointerY = _a[1];
                            var _b = __read(pointCanvasToWorld(pointerX, pointerY), 2), worldPointerX = _b[0], worldPointerY = _b[1];
                            var _c = __read(pointCanvasToWorld(dragStartX, dragStartY), 2), worldDragStartX = _c[0], worldDragStartY = _c[1];
                            viewport.left -= worldPointerX - worldDragStartX;
                            viewport.top -= worldPointerY - worldDragStartY;
                            dragStartX = pointerX;
                            dragStartY = pointerY;
                            requestRender();
                        }
                    });
                    window.addEventListener("wheel", function (e) {
                        e.preventDefault();
                        var delta = e.deltaY;
                        var _a = __read(pointScreenToCanvas(e), 2), pointerX = _a[0], pointerY = _a[1];
                        var newZoom = Math.max(0.5, viewport.zoom * (1 - delta * 0.01));
                        var _b = __read(pointCanvasToWorld(pointerX, pointerY), 2), worldPointerX = _b[0], worldPointerY = _b[1];
                        var newLeft = -(pointerX / newZoom - worldPointerX);
                        var newTop = -(pointerY / newZoom - worldPointerY);
                        var newViewport = {
                            top: newTop,
                            left: newLeft,
                            zoom: newZoom
                        };
                        viewport = newViewport;
                        requestRender();
                    }, { passive: false });
                    return [2 /*return*/];
            }
        });
    });
}
function fetchText(filename) {
    return __awaiter(this, void 0, void 0, function () {
        var request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(filename)];
                case 1:
                    request = _a.sent();
                    return [2 /*return*/, request.text()];
            }
        });
    });
}
main()["catch"](function (err) { return console.log(err.stack); });
