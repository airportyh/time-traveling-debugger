import sys
from .see_calls import SeeCalls

def main():
    if len(sys.argv) < 2:
        print("Please provide a .sqlite file and a version number.")
        return
    filename = sys.argv[1]
    if len(sys.argv) >= 3:
        snapshot_id = int(sys.argv[2])
    else:
        snapshot_id = None

    if not filename.endswith(".sqlite"):
        print("Please provide a .sqlite file.")
        return
    
    see_calls = SeeCalls(filename, snapshot_id)
    see_calls.display_calls()

if __name__ == "__main__":
    main()