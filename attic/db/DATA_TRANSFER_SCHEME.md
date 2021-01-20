# Data Transfer Scheme

Messages:

```
newFunCall({
    id: 27,
    funName: "fib", 
    parameters: { n: 1, m: *5 }
})
newSnapshot({
    id: 57,
    stack: [
        *12,
        &25 { funCall: 27, variables: &37 { n: 2, x: 4, m: *5 } }
    ],
    heap: {
        1: *5,
        2: *6
    }
})
```
