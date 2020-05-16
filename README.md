# Play Programming Language

Play is small programming language intended for used as a test bed
for various compiler, runtime, and debugger technologies.
It uses nearley.js and moo.js for building the parser.

To learn more about how Play is built:

* See Play's predecessor: [fun-lang](https://github.com/airportyh/fun-lang).
* Watch this [video series](https://www.youtube.com/playlist?list=PLSq9OFrD2Q3DasoOa54Vm9Mr8CATyTbLF)
to learn how to make a programming language.

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

## Deep Zoom Debugger

I've started a [new repo called Deep Zoom Debugger](https://github.com/airportyh/deep-zoom-debugger) for a branch of this on going work, which is an experiment to create a zoom-based user-interface for
post-mortem debuggers. It uses the play-lang parser.

You can [watch a demo of the deep-zoom debugger](https://www.youtube.com/watch?v=lVb9bt7wDy8&t).

## Todo

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

* case: a parameter to a function is in the closure provider, we need to use
$setHeapVariable to initial it in the closure, and remove it from the initialization
of stack variables
* gather closure info function, doesn't work with the loop iterator variable of a for loop
* suspend execution while in debugger mode
* display closure variables in stack frame within debugger
* UI for time-traveling (1st draft done)
* DOM events
* make closures work...
