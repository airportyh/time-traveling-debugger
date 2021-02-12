# Time Traveling Debugger

This project is an attempt to build a usable, practical, and useful
*time-traveling* debugger, viable for professional use.
A time-traveling debugger works by recording the each state in the
execution of a program into a database - we call that the history file - 
and then allowing the programmer to navigate through this file to 
investigate the cause of bugs.

## Subprojects

* [cpython](./cpython) - a modified version of Python that generates a log file as a `.py`
file is executed. That log contains info that is needed to recreate the past
states of the program, which is handled by the `recreate.py` program.
* [history-api](./history-api) - a Node.js/Express-based REST API endpoint which given a SQLite
history file, returns a programs past states. Debugger frontends are driven
off this API.
* [term-debugger](./term-debugger) - a terminal-based step debugger frontend written in Node.js
and native EcmaScript modules.
* [zoom-debugger](./zoom-debugger) - a HTML5 Canvas-based ZUI debugger frontend written in TypeScript
with Webpack as the bundler.
* [json-like](./json-like) - a parser for a JSON-like data format with features specific to
the time-traveling debugger.
* [play-lang](./play-lang) - a small programming language with built-in time-travel support.
* [timenav](./timenav) - a terminal-based debugger frontend built-in Python. This aims to
be the next iteration of the debugger frontends.

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

