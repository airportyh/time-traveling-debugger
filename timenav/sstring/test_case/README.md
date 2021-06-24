test case code for error:

Traceback (most recent call last):
  File "/Users/airportyh/Home/TimeTravel/bin/../timenav/gui.py", line 314, in <module>
    raise e
  File "/Users/airportyh/Home/TimeTravel/bin/../timenav/gui.py", line 311, in <module>
    nav.run()
  File "/Users/airportyh/Home/TimeTravel/bin/../timenav/gui.py", line 120, in run
    self.goto_snapshot(next)
  File "/Users/airportyh/Home/TimeTravel/bin/../timenav/gui.py", line 188, in goto_snapshot
    self.update_stack_pane()
  File "/Users/airportyh/Home/TimeTravel/bin/../timenav/gui.py", line 239, in update_stack_pane
    value_lines = self.value_renderer.render_value(value, version, set(), 1)
  File "/Users/airportyh/Home/TimeTravel/timenav/value_renderer.py", line 29, in render_value
    retval = self.render_value(real_value, version, visited, level)
  File "/Users/airportyh/Home/TimeTravel/timenav/value_renderer.py", line 50, in render_value
    return self.render_object(value, version, visited, level)
  File "/Users/airportyh/Home/TimeTravel/timenav/value_renderer.py", line 121, in render_object
    raise Exception("Object value has more than 2 values %r" % value)
Exception: Object value has more than 2 values {'id': 35934, 'type': 10, 'version': 11494, 'value': '35933 36187 36187 36187', 'type_name': 'object'}

After running with pyrewind and the starting debugger and then pressing RIGHT_ARROW