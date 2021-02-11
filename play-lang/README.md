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

## Running the Step Debugger

To debug a program after having run it:

        `./debug <.history file>`
        
You should see a terminal-based GUI appear after a brief moment, which should allow you
to navigate the history of the program. Here are the commands:

* `Down Arrow` - step over
* `Up Arrow` - step over backwards
* `i` - step into
* `o` - step out
* `q` - quit the debugger

You also have the ability to scroll using a mouse wheel or track pad gesture within the
various panes. To scroll horizontally, hold down `Alt` while using the mouse wheel or
track pad gesture.

Also, you can use low-level mode which allows you to see the heap objects in more detail:

        `./debug <.history file> low`
        
## Running the Zoom Debugger

The zoom debugger is an experimental debugger that uses a Zooming User Interface. To run it:

        `./debug-zoom <.history file>`

## Videos about the Time Traveling Debugger

The current major experimental feature I am going for is the time traveling debugger,
to learn more about it, you can watch these videos:

* [Time Traveling Debugger - Part 1](https://www.youtube.com/watch?v=pDOLtvPjYXM)
* [Time Traveling Debugger - Part 2](https://www.youtube.com/watch?v=dTv9aDZqEkI)
* [Time Traveling Debugger - Part 3](https://www.youtube.com/watch?v=esvlb3ss14A)
* [Dream of the Time Machine](https://www.youtube.com/watch?v=xwhm7g9GjuY)
* [Implementing Closures in Play Lang Playlist](https://www.youtube.com/playlist?list=PLSq9OFrD2Q3Aw1Q4NuIZq9c87FDw_EN-S)
* [Live Code: Debug Mode and Suspension](https://www.youtube.com/watch?v=dkuhfht93vQ&list=PLSq9OFrD2Q3BKZs7E-Un55QYzeoiaeSTk)
* [Live Code: Todo MVC](https://www.youtube.com/watch?v=5kr0p2RddSw&list=PLSq9OFrD2Q3BpxGnJXrhtDyN39p1UYU9z)
* [Time Machine Status Update 1](https://www.youtube.com/watch?v=USyEofrn2aI)

## Deep Zoom Debugger

I've started a [new repo called Deep Zoom Debugger](https://github.com/airportyh/deep-zoom-debugger) for a branch of this on going work, which is an experiment to create a zoom-based user-interface for
post-mortem debuggers. It uses the play-lang parser. Here are two introductory videos
about the debugger:

* [Introducing the Deep-Zoom Debugger (5 minutes)](https://www.youtube.com/watch?v=QE54x1ahHa4)
* [Deep-Zoom Debugger Demo with Huiqi Zhou (17 minutes)](https://www.youtube.com/watch?v=lVb9bt7wDy8&t).

## Python Implementation

I am also working on a modified version of Python which can log and recreate
the past state of the program: https://github.com/airportyh/cpython.

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
