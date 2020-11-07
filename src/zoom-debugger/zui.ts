
export type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ZoomRenderable = {
    id(): string;
    
    hoverable(): boolean;
    
    render(
        ctx: CanvasRenderingContext2D, 
        boundingBox: BoundingBox, 
        viewport: BoundingBox
    ): Map<BoundingBox, ZoomRenderable>;
};
