# Oui

Oui is a user interface framework for terminal-based applications. It is written
in Python and aims to be:

* simple - the core architecture should not be complicated
* composable - it should be straight-forward to combine UI elements in new ways
* practical - it should provide common UI elements found in standard UI paradigms
* customizable - it should be straight-forward to write custom UI elements
* understandable - the internals of the framework should be easy to understand

It has adopted Flutter's layout algorithm as documented here:

* https://flutter.dev/docs/resources/architectural-overview#layout-and-rendering
* https://www.youtube.com/watch?v=UUfXWzp0-DU

## UI Element Protocol

Although the framework provides a set of out-of-the-box UI elements, any object can be
deemed a UI element as long as it adheres to the following requirements:

### Required

* a `layout(constraints)` method which determines and sets the `size` attribute
of the element when called, which should be a 2-tuple of integers `(width, height)`.
The `constraints` parameter is a `BoxConstraints` object, containing optional
`min_width`, `max_height`, `min_height`, and `max_height` attributes.
If any of these 4 attributes are None, that means no constraint is placed on that attribute.
* a `paint(pos)` method which draws the visual of the element to the terminal. `pos`
is a 2-tuple of integers `(x, y)` which specify the position of the top-left corner of
the element. The element should set their `pos` attribute to the `pos` that was passed in
as a means of cache their position.
* The `size` attribute is a 2-tuple of integers `(width, height)`, and is
initially not set, but rather set during the layout phase.
* The `pos` attribute is a 2-tuple of integers `(x, y)`, and is initially not set,
but rather set during the paint phase.

### Optional

* The `children` attribute is a list of child UI elements satisfying the same
requirements listed here. It is initially not set, and only set the first time a child
has been added to an element, usually via the `add_child(parent, child)` function from `oui`.
* a `want_focus()` method may be provided which returns a boolean value. If it returns `True`
that means the elements can and is willing to accept keyboard input, and will become a candidate
for accepting keyboard focus.
* Event handlers - for each event that is available in the system, any element can provide
a method of the same name as the event as the event handler. For example, to provide a handler
for the `click` event, an element may implement the `click(event)` method, and that method will
be called each time the element is clicked, which an event object as the argument. It is also
possible to attach multiple event handlers to the same event for an element, to do this, you
use the `add_listener(element, event_name, handler, front=False)` function from `oui`. When you
do this, it turns the attribute of the event name (say `click`) into a list, rather than a method,
and appends the new handler to the list. If there previously exists a method for that event, the
method object will be appended to the new list of handlers. Here,
    * `element` - the element to add the handler to
    * `event_name` - the name of the event to handle
    * `handler` - a function or callable to be invoked when event occurs
    * `front` - whether to insert this handler to the beginning of the list or the end
* a `stretch` attribute containing one of: `"x"`, `"y"`, and `"both"` for the direction you
want the element to stretch. As a convinience, this attribute can be attached to the element
with a call to `add_child(parent, child, stretch=None)` as the 3rd parameter. The implementation
of how an element is actually stretched depends on the parent UI element that the element has been
added to. Known implementations are by `VBox`, `HBox`, and `Board`.

### Events

The implementing of the events is provided in `timenav/events`.
This is the current available list of events in Oui:

* `mousedown`
* `rightmousedown`
* `mouseup`
* `click`
* `dblclick`
* `wheeldown`
* `wheelup`
* `mousemove`
* `mousedrag`
* `ctrlwheeldown`
* `ctrlwheelup`
* `keypress`