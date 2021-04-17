
# fun_call = api.fetch_fun_call(1)
# 
# fun_call = api.fetch_root_fun_call()
# object_cache['FunCall/%d' % fun_call['id']] = fun_call
# attachments = fun_call['attachments']
# del fun_call['attachments']
# 
# for key, item in attachments.items():
#     object_cache[key] = item
# 
# 
# fun = object_cache["Fun/%d" % fun_call['fun_id']]
# code_file = object_cache["CodeFile/%d" % fun['code_file_id']]
# 
# code_lines = code_file['source'].split('\n')
# 
# fun_call = api.fetch_fun_call(fun_call['id'])
# attachments = fun_call['attachments']
# for key, item in attachments.items():
#     object_cache[key] = item

# snapshots = fun_call['snapshots']

# code_display_lines = []
# curr_line = None
# for i, snapshot in enumerate(snapshots):
#     if curr_line and curr_line.line_no == snapshot['line_no']:
#         curr_line.add(snapshot)
#     else:
#         curr_line = CodeDisplayLine(code_lines[snapshot['line_no'] - 1], snapshot)
#         code_display_lines.append(curr_line)
# 
# largest_line_no = reduce(
#     lambda l, snapshot: max(l, snapshot['line_no']), snapshots, 0)
# gutter_width = len(str(largest_line_no))
# 
# for i, display in enumerate(code_display_lines):
#     line_no = display.line_no
#     line_no_display = '\u001b[36m' + str(line_no).rjust(gutter_width) + '\u001b[0m'
#     print_at(1, i + 1, line_no_display + '  ' + display.code)
# 
# mouse_on()
# # mouse_motion_on()
# 
# while True:
#     answer = get_input()
#     if answer == "q":
#         break
#     if answer[0] == '\x1B':
#         events = decode_input(answer)
# 
#         print(events, end = '')
#     sys.stdout.flush()