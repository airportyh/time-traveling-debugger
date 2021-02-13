# Term Debugger

This is a terminal-based time traveling debugger written in Node.js.
It features a ncurses-like UI although it does not use ncurses or any UI library.
It is driven off the data fetched from the history-api which in turn reads data
from a SQLite history file.

## Running the Term Debugger

To debug a program after having run it:

        `debug <.history file>`
        
You should see a terminal-based GUI appear after a brief moment, which should allow you
to navigate the history of the program. Here are the commands:

* `Down Arrow` - step over
* `Up Arrow` - step over backwards
* `i` - step into
* `o` - step out
* `Click` on a line of source - fast forward for the next execution of selected line (if exists)
* `Right Click` or `Ctrl Click` on a line in source - rewind to the previous execution of selected line (if exists)
* `Wheel Scroll Up` - scroll up within the panel touching pointer
* `Wheel Scroll Down` - scroll down within the panel touching pointer
* `Alt-Wheel Scroll Up` - scroll left within the panel touching pointer
* `Alt-Wheel Scroll Down` - scroll right within the panel touching pointer
* `q` - quit the debugger

Also, you can use low-level mode which allows you to see the heap objects in more detail:

        `debug <.history file> low`