import { parse } from "../parser";
import { BoundingBox, TextMeasurer } from "./fit-box";
import { ZoomRenderable } from "./zui";
import { HistoryEntry } from "./play-lang";
import { CodeScopeRenderer } from "./code-scope-renderer";

type Scope = {
    bbox: BoundingBox,
    renderable: ZoomRenderable
};

export function initZoomDebugger(element: HTMLElement, code: string, history: HistoryEntry[]) {
    const canvasWidth = element.offsetWidth * 2;
    const canvasHeight = element.offsetHeight * 2;
    if (canvasWidth === 0 || canvasHeight === 0) {
        throw new Error(`Container element has 0 dimension.`);
    }
    let dragging = false;
    let dragStartX: number;
    let dragStartY: number;
    const ast = parse(code);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.border = "1px solid black";
    canvas.style.transform = `scale(0.5) translate(-${canvas.width / 2}px, -${canvas.height / 2}px)`;

    let viewport = {
        top: - canvas.height / 2,
        left: - canvas.width / 2,
        zoom: 0.5
    };
    
    const ctx = canvas.getContext("2d");

    element.appendChild(canvas);
    ctx.textBaseline = "top";
    const textMeasurer = new TextMeasurer(ctx, true);
    
    const mainScope: Scope = {
        bbox: {
            y: 0,
            x: 0,
            width: canvas.width,
            height: canvas.height
        },
        renderable: new CodeScopeRenderer(history, "main()", ast, code, textMeasurer)
    };
    
    let currentScopeChain: Scope[] = [mainScope];
    // Scope chain looks like [inner most, middle scope, outer most]

    requestRender();
    
    element.addEventListener("mousedown", (e: MouseEvent) => {
        dragging = true;
        [dragStartX, dragStartY] = pointScreenToCanvas(e);
    });

    element.addEventListener("mouseup", () => {
        dragging = false;
    });

    element.addEventListener("mousemove", (e: MouseEvent) => {
        if (dragging) {
            const [pointerX, pointerY] = pointScreenToCanvas(e);
            const [worldPointerX, worldPointerY] = pointCanvasToWorld(pointerX, pointerY);
            const [worldDragStartX, worldDragStartY] = pointCanvasToWorld(dragStartX, dragStartY);
            viewport.left -= worldPointerX - worldDragStartX;
            viewport.top -= worldPointerY - worldDragStartY;
            dragStartX = pointerX;
            dragStartY = pointerY;
            requestRender();
        }
    });
    
    element.addEventListener("wheel", function (e: any) {
        e.preventDefault();
        const delta = e.deltaY;
        const [pointerX, pointerY] = pointScreenToCanvas(e);
        const newZoom = Math.max(0.5, viewport.zoom * (1 - delta * 0.01));

        const [worldPointerX, worldPointerY] = pointCanvasToWorld(pointerX, pointerY);
        const newLeft = - (pointerX / newZoom - worldPointerX);
        const newTop = - (pointerY / newZoom - worldPointerY);
        const newViewport = {
            top: newTop,
            left: newLeft,
            zoom: newZoom
        };
        viewport = newViewport;
        
        requestRender();
      }, { passive: false });

    function requestRender() {
        requestAnimationFrame(render);
    }
    
    function entirelyContainsViewport(bbox) {
        return bbox.x <= 0 && bbox.y <= 0 &&
            (bbox.x + bbox.width > canvasWidth) && 
            (bbox.y + bbox.height > canvasHeight);
    }
    
    function renderZoomRenderable(renderable: ZoomRenderable, bbox: BoundingBox, ancestry: Scope[]): Scope[] | null {
        const viewportBBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
        const childRenderables = renderable.render(ctx, bbox, viewportBBox);
        let childEnclosingRenderable: Scope[] | null = null;
        const myScope = {
            bbox: boxCanvasToWorld(bbox),
            renderable
        };
        for (let [childBBox, renderable] of childRenderables.entries()) {
            const result = renderZoomRenderable(renderable, childBBox, [myScope, ...ancestry]);
            if (result) {
                childEnclosingRenderable = result;
            }
        }
        if (childEnclosingRenderable) {
            return childEnclosingRenderable;
        } else {
            if (entirelyContainsViewport(bbox)) {
                return [myScope, ...ancestry];
            } else {
                return null;
            }
        }
    }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const currentScope = currentScopeChain[0];
        const bBox = boxWorldToCanvas(currentScope.bbox);
        const enclosingScopeChain = renderZoomRenderable(currentScope.renderable, bBox, currentScopeChain.slice(1));
        if (enclosingScopeChain) {
            currentScopeChain = enclosingScopeChain;
        } else {
            if (currentScopeChain.length > 1) {
                currentScopeChain = currentScopeChain.slice(1);
            } else {
                currentScopeChain = [mainScope];
            }
        }
    }
    
    function pointScreenToCanvas(e: MouseEvent): [number, number] {
        return [
            e.offsetX,
            e.offsetY
        ];
    }
    
    function pointCanvasToWorld(x: number, y: number): [number, number] {
        return [
            x / viewport.zoom + viewport.left,
            y / viewport.zoom + viewport.top
        ];
    }

    function boxWorldToCanvas(box: BoundingBox): BoundingBox {
        return {
            y: (box.y - viewport.top) * viewport.zoom,
            x: (box.x - viewport.left) * viewport.zoom,
            width: box.width * viewport.zoom,
            height: box.height * viewport.zoom
        };
    }
    
    function boxCanvasToWorld(box: BoundingBox): BoundingBox {
        return {
            y: (box.y / viewport.zoom) + viewport.top,
            x: (box.x / viewport.zoom) + viewport.left,
            width: box.width / viewport.zoom,
            height: box.height / viewport.zoom
        };
    }
    
}

