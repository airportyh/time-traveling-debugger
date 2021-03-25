# Time Traveling Debugger

This project is an attempt to build a usable, practical, useful and viable
*record/replay debugger*.

A time-traveling debugger works by recording the each state in the
execution of a program into a database - we call that the history file - 
and then allowing the programmer to navigate through this file to 
investigate the cause of bugs.

## Subprojects

* [cpython](https://github.com/airportyh/cpython) - a modified version of Python (Code-named: Python Rewind) that generates a log file as a program is executed. That log contains info that is needed to recreate the past
states of the program, which is handled by the `recreate.py` program. `recreate.py` generates
a SQLite-based history file.
* [history-api](./history-api) - a Node.js/Express-based REST API endpoint which returns a program's past states based on its SQLite-based history file. Debugger frontends are driven
off this API.
* [term-debugger](./term-debugger) - a terminal-based step debugger frontend written in Node.js
and EcmaScript modules.
* [zoom-debugger](./zoom-debugger) - a HTML5 Canvas-based ZUI debugger frontend written in TypeScript with Webpack as the bundler.
* [json-like](./json-like) - a parser for a JSON-like data format with features specific to
the time-traveling debugger, written in JavaScript.
* [play-lang](./play-lang) - a small programming language with built-in time-travel support.
A program executed written in Play automatically generates a SQLite-based history file.
* [timenav](./timenav) - a terminal-based debugger frontend built-in Python. This aims to
be the next iteration of the debugger frontend. It also aims to be a use case for the debugger
itself as the debugger will be developed with the help of the debugger itself - a case of
dog-fooding.

## Setup

This section is for developers who want to test out or modify the code.
This has only been tested on OSX, apologies to Windows users. If you are on an unsupported
platform and is interested in testing this out, let us know by submitting an issue.

1. Clone this repo and cd into the project directory.
2. `. add-path` - this will add the project's `bin` directory to your path.
3. `npm-install` - this will install the dependencies (via npm) for each of the JavaScript-based
subprojects.
4. To build the modified version of CPython:
    1. Install `gcc` if you haven't. For OSX, you can install either the Apple Command Line Developer Tools or XCode (XCode takes up much more disk space).
    2. `get-python` - this will use git's submodule feature to fetch the code for cpython. (~10 minutes)
    3. `cd cpython`
    4. `./configure` - configured the build environment based on your system's libraries, compiler, and other tools available. (~2 minutes)
    5. `make` - build the Python (~5 minutes)
    6. `cd ..`

## Command-Line Tools

Once setup is complete, you are provided with a set of command-line tools:

1. `pyrewind` - used exactly like the `python` command, it invokes the modified version
of Python with time-travel support if used with `.py` files. When you execute a `.py` file,
a log file with the `.rewind` suffix is created. For example: `pyrewind fib.py` will generate
a file called `fib.rewind`. Time-travel support is turned off when `pyrewind` is used as a 
REPL or used to execute a built-in module.
2. `recreate` - this program takes a `.rewind` file as input and generates a SQLite-based
history file as output with the `.sqlite` suffix. For example: `recreate fib.rewind` will
create a SQLite database called `fib.sqlite`. This database file can in turn by used to
debug the originating program using one of the debugger frontends.
3. `debug` - starts the terminal-based step debugger. This command takes a `.rewind` log file or a history file as input. For example: `debug fib.sqlite` or `debug fib.rewind`. 
If the input is a `.rewind` log file, it will call the `recreate` command to convert it to
a `.sqlite` file before launching the debugger. This debugger has a ncurses-style GUI 
and is controlled using one-stroke keyboard commands similar less and nano. 
It also supports mouse and scroll-wheel interactions for terminals that support it.
4. `zoom` - starts the zoom debugger. This command also takes a history file as input. For
example: `zoom fib.sqlite`. Running this command spawns a browser window within which
the HTML5 canvas-based debugger executes.

## Videos about the Time Traveling Debugger

I have been documenting work on the time-traveling debugger in video format. You can find all the videos
in [this playlist](https://www.youtube.com/playlist?list=PLSq9OFrD2Q3Cpyk2LD1vE0161Jg82HJ7d). Notable videos are:

* [Dream of the Time Machine](https://www.youtube.com/watch?v=xwhm7g9GjuY)
* [Introducing the Deep-Zoom Debugger (5 minutes)](https://www.youtube.com/watch?v=QE54x1ahHa4)
* [Deep Zoom Debugger Demo with Huiqi](https://www.youtube.com/watch?v=lVb9bt7wDy8)
* [How Time-Traveling Works](https://www.youtube.com/watch?v=u6HR_bQfzDE)
* [Time Traveling Debugger for Python](https://www.youtube.com/watch?v=h80C9zzyf7k)
* [rr and Record Replay Debuggers](https://www.youtube.com/watch?v=cCf7hiZvJrY)

## Other Projects, Products, Papers on Time Travel Debugging

* https://replay.io/ - A replay debugger for JavaScript frontend applications based on Firefox. 
* https://rr-project.org/ - A replay debugger for C and C++. [Paper: Engineering Record and Replay for Deployability](https://arxiv.org/pdf/1705.05937.pdf)
* https://github.com/burg/replay-staging - Timelapse - a replay debugger based on Safari
* https://oz-code.com/ - a replay debugger for .NET
* https://github.com/OmniscientDebugger/LewisOmniscientDebugger - an omniscient debugger for Java. [Paper: Debugging Backwards in Time](https://arxiv.org/abs/cs/0310016). [Video](https://youtu.be/xpI8hIgOyko)
* https://github.com/endplay/omniplay - Arnold - an eidetic Linux-based system. [Paper: Eidetic Systems](https://www.cc.gatech.edu/~ddevecsery6/papers/devecsery14.pdf)
* [Paper: A Review of Reverse Debugging](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.338.3420) - Jakon Engblom
* [Sayid](https://github.com/clojure-emacs/sayid) - Omniscent debugger for Clojure. [Video](https://youtu.be/ipDhvd1NsmE)

## Dependencies

This project is dependent on the following technologies:

* Node.js / Express
* Python 3
* SQLite
* better-sqlite3
* Nearley.js / Moo.js
* TypeScript
* HTML5 Canvas
* Webpack
* gcc / automake
