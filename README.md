# Time Traveling Debugger

This project is an attempt to build a usable, practical, useful and viable
*time-traveling debugger*.

A time-traveling debugger works by recording the each state in the
execution of a program into a database - we call that the history file - 
and then allowing the programmer to navigate through this file to 
investigate the cause of bugs.

## Subprojects

* [cpython](https://github.com/airportyh/cpython) - a modified version of Python that generates a log file as a program is executed. That log contains info that is needed to recreate the past
states of the program, which is handled by the `recreate.py` program. `recreate.py` generates
a SQLite-based history file.
* [history-api](./history-api) - a Node.js/Express-based REST API endpoint which returns a program's past states based on its SQLite-based history file. Debugger frontends are driven
off this API.
* [term-debugger](./term-debugger) - a terminal-based step debugger frontend written in Node.js
and native EcmaScript modules.
* [zoom-debugger](./zoom-debugger) - a HTML5 Canvas-based ZUI debugger frontend written in TypeScript with Webpack as the bundler.
* [json-like](./json-like) - a parser for a JSON-like data format with features specific to
the time-traveling debugger, written in JavaScript.
* [play-lang](./play-lang) - a small programming language with built-in time-travel support.
A program executed written in Play automatically generates a SQLite-based history file.
* [timenav](./timenav) - a terminal-based debugger frontend built-in Python. This aims to
be the next iteration of the debugger frontend. It also aims to be a use case for the debugger
itself as the debugger will be developed with the help of the debugger itself - a case of
dog-fooding.

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

## Setup

This section is for developers who want to test out or modify the code.
This has only been tested on OSX, apologies to Windows users. If you are on an unsupported
platform and have trouble with the setup, let us know by submitting an issue.

1. Clone this repo and cd into the project directory.
2. `. add-path` - this will add the project's `bin` directory to your path.
3. `get-python` - this will use git's submodule feature to fetch the code for cpython.
4. `npm-install` - this will install the dependencies (via npm) for each of the JavaScript-based
subprojects.

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
3. `debug` - starts the terminal-based step debugger. This command takes a history file as
input. For example: `debug fib.sqlite`. This debugger has a ncurses-style GUI and is controlled
using one-stroke keyboard commands similar less and nano. It also supports mouse and scroll-wheel
interactions for terminals that support it.
4. `zoom` - starts the zoom debugger. This command also takes a history file as input. For
example: `zoom fib.sqlite`. Running this command spawns a browser window within which
the HTML5 canvas-based debugger executes.
