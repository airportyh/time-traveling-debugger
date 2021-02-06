/*export type StackFrame = {
    funName: string,
    parameters: { [paramName: string]: any },
    variables:  { [varName: string]: any }
};

export type HistoryEntry = {
    idx: number,
    line: number,
    stack: StackFrame[],
    heap: { [id: number]: any }
};*/

export type FunCall = {
    id: number,
    fun_name: string,
    locals: number,
    globals: number | null,
    closure_cellvars: string,
    closure_freevars: string,
    parent_id: number,
    code_file_id: number
};

export type Snapshot = {
    id: number,
    fun_call_id: number,
    stack: number,
    heap: number,
    interop: number,
    line_no: number
};

export type DBObject = {
    id: number,
    data: any
}

export type FunCallExpanded = FunCall & {
    snapshots: Snapshot[],
    childFunCalls: FunCall[],
    heapMap: { [key: string]: number }
};