import { BoundingBox, TextMeasurer } from "./fit-box";
import { ZoomRenderable } from "./zui";
import { FunCallRenderer } from "./fun-call-renderer";
import { DataCache } from "./data-cache";

type Scope = {
    bbox: BoundingBox,
    renderable: ZoomRenderable
};

type HoverStateEntry = {
    renderableId: string,
    bbox: BoundingBox
};

export type ZoomDebuggerContext = {
    textMeasurer: TextMeasurer,
    dataCache: DataCache,
    apiBaseUrl: string
};

export async function initZoomDebugger(element: HTMLElement, apiBaseUrl: string) {
    //const throttledRender = throttle(render, 200);
    const dataCache = new DataCache(apiBaseUrl, requestRender);
    // setInterval(() => {
    //     console.log("data cache object map size:", dataCache.objectMap.size);
    //     console.log("data cache fun call map size:", dataCache.funCallMap.size);
    // }, 1000);
    const rootFunCall = await dataCache.fetchRootFunCall();
    
    const canvasWidth = element.offsetWidth * 2;
    const canvasHeight = element.offsetHeight * 2;
    if (canvasWidth === 0 || canvasHeight === 0) {
        throw new Error(`Container element has 0 dimension.`);
    }
    let mouseX: number;
    let mouseY: number;
    let dragging = false;
    let dragStartX: number;
    let dragStartY: number;
    let rootHoverState: HoverStateEntry[] = [];
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.backgroundColor = "white";
    canvas.style.border = "1px solid black";
    canvas.style.transform = `scale(0.5) translate(-${canvas.width / 2}px, -${canvas.height / 2}px)`;
    canvas.style.cursor = "crosshair";
    let viewport = {
        top: - canvas.height / 2,
        left: - canvas.width / 2,
        zoom: 0.5
    };
    
    const ctx = canvas.getContext("2d");

    element.appendChild(canvas);
    ctx.textBaseline = "top";
    const textMeasurer = new TextMeasurer(ctx, true);
    
    const context: ZoomDebuggerContext = {
        textMeasurer,
        dataCache,
        apiBaseUrl
    };
    const mainScope: Scope = {
        bbox: {
            y: 0,
            x: 0,
            width: canvas.width,
            height: canvas.height
        },
        renderable: new FunCallRenderer(rootFunCall, null, context)
    };
    
    let currentScopeChain: Scope[] = [mainScope];
    // Scope chain looks like [inner most, middle scope, outer most]

    requestRender();
    
    element.addEventListener("mousedown", (e: MouseEvent) => {
        dragging = true;
        dragStartX = e.offsetX;
        dragStartY = e.offsetY;
    });

    element.addEventListener("mouseup", () => {
        dragging = false;
    });

    element.addEventListener("mousemove", (e: MouseEvent) => {
        mouseX = e.offsetX;
        mouseY = e.offsetY; 
        if (dragging) {
            const pointerX = e.offsetX;
            const pointerY = e.offsetY;
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
        const pointerX = e.offsetX;
        const pointerY = e.offsetY;
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
    
    function entirelyContainsViewport(bbox: BoundingBox) {
        return bbox.x <= 0 && bbox.y <= 0 &&
            (bbox.x + bbox.width > canvasWidth) && 
            (bbox.y + bbox.height > canvasHeight);
    }
    
    function bboxContains(bbox: BoundingBox, x: number, y: number) {
        return x >= bbox.x && y >= bbox.y && x <= bbox.x + bbox.width && y <= bbox.y + bbox.height;
    }
    
    function renderZoomRenderable(
        renderable: ZoomRenderable, 
        bbox: BoundingBox,
        hoverState: HoverStateEntry[],
        ancestry: Scope[],
        level: number
    ): Scope[] | null {
        const indent = Array(level + 1).join("  ");
        const viewportBBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
        // TODO: fix <QUESTIONABLE-CODE> - update bbox
        // for (let hoverEntry of rootHoverState) {
        //     if (hoverEntry.renderableId === renderable.id()) {
        //         hoverEntry.bbox = bbox;
        //     }
        // }
        // </QUESTIONABLE-CODE>
        
        const childRenderables = renderable.render(ctx, bbox, viewportBBox);
        let childEnclosingRenderable: Scope[] | null = null;
        const myScope = {
            bbox: boxCanvasToWorld(bbox),
            renderable
        };
        
        // let hoveredChild: ZoomRenderable;
        // let hoveredChildBBox: BoundingBox;
        // let nextHoverState: HoverStateEntry[];
        
        for (let [childBBox, renderable] of childRenderables.entries()) {
            // if (isHovered(hoverState, renderable)) {
            //     hoveredChild = renderable;
            //     hoveredChildBBox = getBBoxForHovered(childBBox);
            //     nextHoverState = hoverState.slice(1);
            // } else if (hoverState.length === 0 && renderable.hoverable() && bboxContains(childBBox, mouseX, mouseY)) {
            //     hoveredChild = renderable;
            //     hoveredChildBBox = getBBoxForHovered(childBBox);
            //     const hse = {
            //         renderableId: renderable.id(),
            //         bbox: hoveredChildBBox
            //     };
            //     nextHoverState = [];
            //     rootHoverState.push(hse);
            // } else {
            const result = renderZoomRenderable(renderable, childBBox, hoverState, [myScope, ...ancestry], level + 1);
            if (result) {
                childEnclosingRenderable = result;
            }
            // }
        }
        
        // if (hoveredChild) {
        //     const result = renderZoomRenderable(hoveredChild, hoveredChildBBox, nextHoverState, [myScope, ...ancestry], level + 1);
        //     if (result) {
        //         childEnclosingRenderable = result;
        //     }
        // }
        
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
    
    function isHovered(hoverState: HoverStateEntry[], renderable: ZoomRenderable): boolean {
        return hoverState.length > 0 && hoverState[0].renderableId === renderable.id();
    }
    
    // function getBBoxForHovered(bbox: BoundingBox): BoundingBox {
    //     const zoomFactor = 2.2;
    //     const width = bbox.width * zoomFactor;
    //     const height = bbox.height * zoomFactor;
    //     const biggerBBox = {
    //         x: bbox.x - (width - bbox.width) / zoomFactor,
    //         y: bbox.y - (height - bbox.height) / zoomFactor,
    //         width: width,
    //         height: height
    //     };
    //     return biggerBBox;
    // }
    
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const currentScope = currentScopeChain[0];
        const bBox = boxWorldToCanvas(currentScope.bbox);
        for (let i = rootHoverState.length - 1; i >= 0; i--) {
            const entry = rootHoverState[i];
            if (bboxContains(entry.bbox, mouseX, mouseY)) {
                break;
            } else {
                rootHoverState.pop();
            }
        }
        let hoverState = rootHoverState;
        if (isHovered(hoverState, currentScope.renderable)) {
            hoverState = hoverState.slice(1);
        }
        const enclosingScopeChain = renderZoomRenderable(currentScope.renderable, bBox, hoverState, currentScopeChain.slice(1), 0);
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