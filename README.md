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

## Todo

* heap display goes into disarray when there is too much data
* bug: why is styles object nested in dom.play example?
* numbers nested inside objects are always being interpreted as heap IDs, we may need ref objects to * distinguish refs
* there seems to be a bug with VDOM when changes styles across multiple calls to setStyle()
* Canvas API
* when scrubbing the timeline, have the code display pan to the selected line
* syntax highlighter for Atom and/or VS Code

## Closure: Problems to Solve

1. displaying closure variables in the debugger
2. multi-level closures
3. cleaning up of closures

## Done

* UI for time-traveling (1st draft done)
* DOM events
* make closures work...
