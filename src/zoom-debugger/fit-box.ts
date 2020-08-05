/*
A bounding box is an rectangular area in a 2D canvas.
*/
export type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/*
A box is either a text box or a container box.
*/
export type Box = TextBox | ContainerBox;

/*
A text box is a box that contains text. It always has type equal to "text".
*/
export type TextBox = {
    type: "text",
    text: string,
    color?: string
    border?: {
        width?: number,
        color?: string
    }
};

/*
A container box is a box that contains other boxes, which in turn
can either be text boxes or container boxes. It always has type equal to
"container". It has a direction which is either vertical or horizontal.
And it has a children array which contains its children boxes.
*/
export type ContainerBox = {
    type: "container",
    direction: "vertical" | "horizontal",
    children: Box[],
    border?: {
        width?: number,
        color?: string
    }
};

/* A point is a coordinate on the canvas 2D plane. */
export type Point = {
    y: number;
    x: number;
}

export type FontSetting = {
    size: number,
    family: string,
    weight: string
};

export class TextMeasurer {
    widthTable: { [key: string]: number } = {};
    ctx: CanvasRenderingContext2D;
    font: string;
    fontSetting: FontSetting;
    fixedWidthFontRatio: { [key: string]: number } = {};
    constructor(ctx: CanvasRenderingContext2D, private fixedWidth: boolean) {
        this.ctx = ctx;
    }
    
    setFont(fontSetting: FontSetting) {
        this.fontSetting = fontSetting;
        this.font = `${fontSetting.weight} ${fontSetting.size}px ${fontSetting.family}`;
        if (this.fixedWidth) {
            this.font = `${fontSetting.weight} ${fontSetting.size}px ${fontSetting.family}`;
            const key = `${fontSetting.weight}-${fontSetting.family}`;
            if (!(key in this.fixedWidthFontRatio)) {
                this.ctx.font = `${fontSetting.weight} 10px ${fontSetting.family}`;
                const ratio = this.ctx.measureText("i").width / 10;
                this.fixedWidthFontRatio[key] = ratio;
            }
        } else {
            this.ctx.font = this.font;
        }
    }

    measureText(text: string): number {
        if (this.fixedWidth) {
            const ratio = this.fixedWidthFontRatio[`${this.fontSetting.weight}-${this.fontSetting.family}`];
            return text.length * ratio * this.fontSetting.size;
        } else {
            let totalWidth = 0;
            for (let chr of text) {
                const chrKey = chr + this.font;
                let width = this.widthTable[chrKey];
                if (!width) {
                    width = this.ctx.measureText(chr).width;
                    this.widthTable[chrKey] = width;
                }
                totalWidth += width;
            }
            
            let width = totalWidth;
            if (this.fontSetting.size > 10000) {
                width = width * (this.fontSetting.size / 10000);
            }
            return width;
        }
    }
}
/*
const layoutSearchTimes: number[] = [];
const layoutSearchTries: number[] = [];
const renderTimes: number[] = [];

function displayLayoutSearchTimeStats() {
    const sum = layoutSearchTimes.reduce((sum, curr) => sum + curr, 0);
    const average = sum / layoutSearchTimes.length;
    const min = Math.min(...layoutSearchTimes);
    const max = Math.max(...layoutSearchTimes);
    console.log("layout search times", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

function displayLayoutSearchTriesStats() {
    const sum = layoutSearchTries.reduce((sum, curr) => sum + curr, 0);
    const average = sum / layoutSearchTries.length;
    const min = Math.min(...layoutSearchTries);
    const max = Math.max(...layoutSearchTries);
    console.log("layout search tries", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

function displayRenderTimeStats() {
    const sum = renderTimes.reduce((sum, curr) => sum + curr, 0);
    const average = sum / renderTimes.length;
    const min = Math.min(...renderTimes);
    const max = Math.max(...renderTimes);
    console.log("fitBox render times", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

setInterval(() => {
    displayLayoutSearchTimeStats();
    displayLayoutSearchTriesStats();
    displayRenderTimeStats();
}, 5000);
*/
/*
Entry point of the fit box algorithm. Given a box to calculate the layout for,
bounding box to fit the box within, a specificed font family and font weight,
and a canvas rendering context (2D), it will first find the best layout for the box
to fit into the provided bounding box, and then it will render the box.
*/
export function fitBox(
    box: Box,
    bbox: BoundingBox,
    visibleBox: BoundingBox,
    fontFamily: string,
    fontWeight: string,
    fixedWidth: boolean,
    textMeasurer: TextMeasurer,
    lineHeight: number,
    ctx: CanvasRenderingContext2D,
    outerBoxColor: string = "#000000"
) {
    let lowerFontSize: null | number = null;
    let upperFontSize: null | number = null;
    let fontSize = 5;
    let bboxMap;
    ctx.strokeStyle = outerBoxColor;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    while (true) {
        if (fontSize === 0) {
            //throw new Error("Unexpected condition");
            break;
        }
        textMeasurer.setFont({
            weight: fontWeight,
            size: fontSize,
            family: fontFamily
        });
        bboxMap = layout(box, { x: bbox.x, y: bbox.y }, fontSize, textMeasurer, lineHeight);
        const myBBox = bboxMap.get(box);
        const allFit = myBBox.height <= bbox.height && myBBox.width <= bbox.width;
        //console.log(`Trying fontSize: ${fontSize}, bbox.width = ${bbox.width}, bbox.height = ${bbox.height}, myBBox.width = ${myBBox.width}, myBBox.height = ${myBBox.height}`);
        
        if (allFit) {
            //console.log("All fit");
            lowerFontSize = fontSize;
            if (upperFontSize) {
                const newFontSize = Math.floor((upperFontSize + fontSize) / 2);
                if (newFontSize === fontSize) {
                    //console.log("Break out of loop");
                    break;
                }
                fontSize = newFontSize;
            } else {
                fontSize *= 2;
            }
        } else {
            //console.log("Didn't fit");
            upperFontSize = fontSize;
            if (lowerFontSize) {
                const newFontSize = Math.floor((lowerFontSize + fontSize) / 2);
                if (newFontSize === fontSize) {
                    break;
                }
                fontSize = newFontSize;
            } else {
                fontSize = Math.floor(fontSize / 2);
            }
        }
    }
    
    
    
    //console.log("font size:", fontSize);
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const resultBBox = bboxMap.get(box);
    // compare resultBBox to bbox
    const xOffset = (bbox.width - resultBBox.width) / 2;
    const yOffset = (bbox.height - resultBBox.height) / 2;
    for (let aBox of bboxMap.keys()) {
        const aBBox = bboxMap.get(aBox);
        aBBox.x += xOffset;
        aBBox.y += yOffset;
    }
    render(box, bboxMap, visibleBox, fontSize, lineHeight, ctx);
    return bboxMap;
}

/*
Given a box, an offset, a font size, and a canvas rendering context. layout calculates
a bounding box for each box (parents and descendents included) as a map that maps a Box
to a BoundingBox.
*/
export function layout(
    box: Box, 
    offset: Point,
    fontSize: number,
    textMeasurer: TextMeasurer, 
    lineHeight: number):
    Map<Box, BoundingBox> {
    if (box.type === "text") {
        if (typeof box.text !== "string") {
            throw new Error("Please provide a string for the text property of a text box.");
        }
        let width = textMeasurer.measureText(box.text);
        //console.log("measureText:", box.text, fontSize, "=", width);
        const height = fontSize * lineHeight;
        const bbox: BoundingBox = {
            ...offset,
            width: width,
            height
        };
        return new Map([[box, bbox]]);
    } else if (box.type === "container") {
        if (box.direction === "vertical") {
            const entries = [];
            let yOffset = offset.y;
            let myWidth = 0;
            let myHeight = 0;
            for (let child of box.children) {
                const bboxMap = layout(
                    child, 
                    { x: offset.x, y: yOffset }, 
                    fontSize, 
                    textMeasurer,
                    lineHeight
                );
                entries.push(...bboxMap);
                const childBBox = bboxMap.get(child);
                let previousYOffset = yOffset;
                yOffset += childBBox.height;
                if (previousYOffset >= 0 && yOffset < 0) {
                    throw new Error(`Number wrapped around: ${previousYOffset}, ${childBBox.height}, ${yOffset}`);
                }
                myHeight += childBBox.height;
                if (childBBox.width > myWidth) {
                    myWidth = childBBox.width;
                }
            }
            const containerBBox: BoundingBox = {
                ...offset,
                height: myHeight,
                width: myWidth
            };
            entries.push([box, containerBBox]);
            return new Map(entries);
        } else if (box.direction === "horizontal") {
            const entries = [];
            let xOffset = offset.x;
            let myWidth = 0;
            let myHeight = 0;
            for (let child of box.children) {
                const bboxMap = layout(
                    child, 
                    { x: xOffset, y: offset.y }, 
                    fontSize, 
                    textMeasurer,
                    lineHeight
                );
                entries.push(...bboxMap);
                const childBBox = bboxMap.get(child);
                let previousXOffset = xOffset;
                xOffset += childBBox.width;
                if (previousXOffset >= 0 && xOffset < 0) {
                    throw new Error(`Number wrapped around: ${previousXOffset}, ${childBBox.width}, ${xOffset}`);
                }
                myWidth += childBBox.width;
                if (childBBox.height > myHeight) {
                    myHeight = childBBox.height;
                }
            }
            const containerBBox: BoundingBox = {
                ...offset,
                height: myHeight,
                width: myWidth
            };
            entries.push([box, containerBBox]);
            return new Map(entries);
        } else {
            throw new Error("Not implemented");
        }
    } else {
        throw new Error("Not implemented");
    }
}

/*
Given a box and a mapping between box and bounding box (you can get
from layout, and a canvas rendering context, renders the box.

Pre-condition: You set the font property on the canvas context.
*/
export function render(
    box: Box,
    bBoxMap: Map<Box, BoundingBox>,
    visibleBox: BoundingBox,
    fontSize: number,
    lineHeight: number,
    ctx: CanvasRenderingContext2D): void
    {
    const mybbox = bBoxMap.get(box);
    if (mybbox.x + mybbox.width < visibleBox.x ||
        mybbox.y + mybbox.height < visibleBox.y ||
        mybbox.x > visibleBox.width ||
        mybbox.y > visibleBox.height) {
        return;
    }
    if (box.type === "text") {
        ctx.save();
        if (box.color) {
            ctx.fillStyle = box.color;
        }
        const yOffset = fontSize * ((lineHeight - 1) / 2);
        drawBorder(box, mybbox, ctx);
        ctx.fillText(box.text, mybbox.x, mybbox.y + yOffset);
        ctx.restore();
    } else if (box.type === "container") {
        for (let child of box.children) {
            render(child, bBoxMap, visibleBox, fontSize, lineHeight, ctx);
        }
        drawBorder(box, mybbox, ctx);
    } else {
        throw new Error("Not implemented");
    }    
}

function drawBorder(box: Box, bbox: BoundingBox, ctx: CanvasRenderingContext2D) {
    if (box.border) {
        const width = box.border.width || 1;
        const color = box.border.color || "black";
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    }
}

/*
Given a bounding box, and the canvas rendering context, draw its outline. 
*/
export function strokeBBox(bbox: BoundingBox, ctx: CanvasRenderingContext2D) {
    ctx.strokeRect(
        bbox.x, 
        bbox.y,
        bbox.width,
        bbox.height
    );
}
