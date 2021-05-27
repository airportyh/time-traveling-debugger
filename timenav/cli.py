from navigator import Navigator
from object_cache import ObjectCache
import sqlite3
import sys

# https://docs.python.org/3/library/sqlite3.html
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 cli.py <.sqlite file> (next|reverse-next|get) <snapshot ID>")
        exit(1)
    filename = sys.argv[1]
    command = sys.argv[2]
    snapshot_id = int(sys.argv[3])
    
    conn = sqlite3.connect(filename)
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cache = ObjectCache(conn, cursor)
    nav = Navigator(conn, cursor, cache, True)

    if command == "next":
        print("Stepping over from snapshot %d" % snapshot_id)
        snapshot = cache.get_snapshot(snapshot_id)
        result = nav.step_over(snapshot)
        print("Final Result:", result)
    elif command == "reverse-next":
        print("Stepping over backward from snapshot %d" % snapshot_id)
        snapshot = cache.get_snapshot(snapshot_id)
        result = nav.step_over_backward(snapshot)
        print("Final Result:", result)
    elif command == "get":
        snapshot = cache.get_snapshot(snapshot_id)
        print("Result:", snapshot)
    else:
        print("Unknown command:", command)

if __name__ == '__main__':
    main()
