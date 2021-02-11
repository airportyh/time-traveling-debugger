# Term Debugger

This is a terminal-based time traveling debugger written in Node.js.
It features a ncurses-like UI although it does not use ncurses or any UI library.
It is driven off the data fetched from the history-api which in turn reads data
from a SQLite history file.