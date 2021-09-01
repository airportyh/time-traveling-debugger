import sys
from .see_code import CodeSeer

def main():
    if len(sys.argv) < 2:
        print("Please provide a .sqlite file and a version number.")
        return
    filename = sys.argv[1]

    if not filename.endswith(".sqlite"):
        print("Please provide a .sqlite file.")
        return
    
    seer = CodeSeer(filename)
    seer.connect()
    seer.fetch_codes()
    seer.fetch_snapshots()
    seer.display_code()

if __name__ == "__main__":
    main()