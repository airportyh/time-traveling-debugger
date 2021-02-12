# JSON-Like

This is a parser for a JSON-like data format. It was adapted from: https://github.com/airportyh/jsonr, but has since taken on features that specific to the needs of the
time traveling debugger project. These features include:

* Heap references that look like `^12345`.
* Immutable object references that look like `*12345`.
* Object and array tags that look like `<Tuple>[1, 2, 3]` or `<Point>{ "x": 1, "y": 2 }`.

The code was inpired by the functional parsing style described in [this Computerphile episode](https://www.youtube.com/watch?v=dDtZLm7HIJs).