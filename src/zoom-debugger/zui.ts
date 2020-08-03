
export type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ZoomRenderable = {
    render(ctx: CanvasRenderingContext2D, boundingBox: BoundingBox, viewport: BoundingBox): 
        Map<BoundingBox, ZoomRenderable>;
};
