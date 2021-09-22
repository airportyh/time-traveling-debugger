import sys
from .see_code2 import SeeCode2

if len(sys.argv) < 3:
    print("Please provide a .sqlite file, a code file ID and a line number.")
    exit(1)
filename = sys.argv[1]
code_file_id = int(sys.argv[2])
line_no = int(sys.argv[3])

if not filename.endswith(".sqlite"):
    print("Please provide a .sqlite file.")
else:
    see_code = SeeCode2(filename, code_file_id, line_no)
    see_code.run()
