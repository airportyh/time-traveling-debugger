
export type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ZoomRenderable = {
    id(): string;
    
    render(
        ctx: CanvasRenderingContext2D, 
        boundingBox: BoundingBox, 
        viewport: BoundingBox,
        mouseX: number,
        mouseY: number
    ): Map<BoundingBox, ZoomRenderable>;
};
