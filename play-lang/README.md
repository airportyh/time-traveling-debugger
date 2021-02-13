# Play Programming Language

Play is small programming language intended for used as a test bed
for various compiler, runtime, and debugger technologies.
It uses nearley.js and moo.js for building the parser.

To learn more about how Play is built:

* See Play's predecessor: [fun-lang](https://github.com/airportyh/fun-lang).
* Watch this [video series](https://www.youtube.com/playlist?list=PLSq9OFrD2Q3DasoOa54Vm9Mr8CATyTbLF)
to learn how to make a programming language.

## Setup

* clone this repo
* `cd play-lang`
* `npm install`
* `npm run gen-parser`
* Test out running and debugging a file with:
    * `./run ex/fib.play`
    * `./debug ex/fib.history`
    
## Running a Program

To run a program you use the `run` command:

        `./run <.play file>`

This should create a history file with the `.history` suffix. 
For example, if you ran `fib.play`, then that should create
the file `fib.history` in the same directory. The history file contains all
past execution states of the program.

## Todo

* return value ref count bug when you have multiple calls in arg list: f(g(), h())
* Terminal Debugger
    * hover over vars and display the values like Chrome
    * styled function signature
    * different layouts
    * color codes with heap objects
    * keys for QWERTY
* Python version - support lists
* language:
    * support dot syntax
* do code challenges

## Older

* unintentional variable shadowing is a usability problem
* when a closure variable hasn't been assigned yet, and you try to use it, strange bugs occur
* passing in a nested style object as an attr in createElement doesn't work
* continue working on deleting a todo in todomvc
* VDOM doesn't work with input values
* some syntax errors are excessively long...
* maybe allow evaluating and display results of function calls in debugger
* do some code challenges on CodeWars, etc
* make some toy programs
* anonymous functions as closure providers
* use static analysis to check for references of undefined functions
* debugger: don't show vdom?
* clean up closures when functions are no longer referenced
* clean up unused heap variables?
* heap display goes into disarray when there is too much data
* bug: why is styles object nested in dom.play example?
* numbers nested inside objects are always being interpreted as heap IDs, we may need ref objects to * distinguish refs
* there seems to be a bug with VDOM when changes styles across multiple calls to setStyle()
* Canvas API
* when scrubbing the timeline, have the code display pan to the selected line
* syntax highlighter for Atom and/or VS Code

## Done

* improve speed of logger. Ideas: (done)
    * compare with file-based logger
    * try batching insert with different batch sizes
* register objects as they are created so that $save does not have to traverse (done)
* automatic reference counting
    * count up for function parameters (done)
    * count up for elements array literals (done)
    * count up for values in dictionary literals (done)
    * count down for elements of arrays on pop frame (done)
    * count down for entries of dictionaries on pop frame (done)
    * count up for assignments to array elements (done)
    * count up for assignments to dictionary entries (done)
    * count down for old value on assignments (done)
    * count down for old value on array assignments (done)
    * count down for old value on dictionary assignments (done)
* case: a parameter to a function is in the closure provider, we need to use
$setHeapVariable to initial it in the closure, and remove it from the initialization
of stack variables
* gather closure info function, doesn't work with the loop iterator variable of a for loop
* suspend execution while in debugger mode
* display closure variables in stack frame within debugger
* UI for time-traveling (1st draft done)
* DOM events
* make closures work...

## How Closures Work

1. Use AST traversal to figure out which functions need closures from which functions,
plus the variable list
2. For functions whose variables are dependent on by inner functions, we need to:
    * allocate an aptly named closure ($<fun name>\_closure) (a dictionary) for storing variables with
    * add the closure created above to the $pushFrame call
3. For each inner function that depends on an outer closure:
    * add the list of closures we need to the $pushFrame call
4. For each variable access to a variable in a closure, call the $setHeapVariable or
$getHeapVariable functions in place of $setVariable or $getVariable


for each function, we come up with the closures it needs:

    [
        {
            funName: "initialUI",
            variables: ["label"]
        },
        {
            funName: "main",
            variables: ["counter"]
        }
    ]
