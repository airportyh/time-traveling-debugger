export type StackFrame = {
    funName: string,
    parameters: { [paramName: string]: any },
    variables:  { [varName: string]: any }
};

export type HistoryEntry = {
    idx: number,
    line: number,
    stack: StackFrame[],
    heap: { [id: number]: any }
};