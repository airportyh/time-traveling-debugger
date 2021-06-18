from lru_cache.cache import LruCache
import sqlite3

class ValueCache:
    def __init__(self, conn, cursor):
        self.cache = LruCache(100000)
        self.conn = conn
        self.cursor = cursor
    
    def get_value(self, id, version):
        if id in self.cache:
            values = self.cache[id]
        else:
            values = self.fetch(id)
            self.cache[id] = values
        return self.get_by_version(values, version)
        
    def fetch(self, id):
        sql = """
        select 
            Value.*,
            Type.name as type_name
        from Value
        inner join Type
            on Value.type = Type.id
        where Value.id = ?
        order by version
        """
        return self.cursor.execute(sql, (id,)).fetchall()
    
    def get_by_version(self, values, version):
        if len(values) == 0:
            return None
        # binary search
        left = 0
        right = len(values) - 1
        while True:
            if left > right:
                return None
            middle = (left + right) // 2
            middle_item = values[middle]
            if middle_item["version"] == version:
                return middle_item
            elif version > middle_item["version"]:
                if middle + 1 >= len(values):
                    return values[-1]
                elif middle + 1 <= right:
                    next_item = values[middle + 1]
                    if version < next_item["version"]:
                        return middle_item
                    else:
                        left = middle + 1
                else:
                    return middle_item
            else:
                assert version < middle_item["version"]
                right = middle - 1

def test1():
    # basic binary search
    cache = ValueCache(None, None)
    values = [
        { "id": 1, "type": 1, "version": 2, "value": 100 },
        { "id": 2, "type": 1, "version": 3, "value": 200 },
        { "id": 3, "type": 1, "version": 7, "value": 300 }
    ]
    assert cache.get_by_version(values, 1) == None
    assert cache.get_by_version(values, 2) == { "id": 1, "type": 1, "version": 2, "value": 100 }
    assert cache.get_by_version(values, 3) == { "id": 2, "type": 1, "version": 3, "value": 200 }
    assert cache.get_by_version(values, 6) == { "id": 2, "type": 1, "version": 3, "value": 200 }
    assert cache.get_by_version(values, 7) == { "id": 3, "type": 1, "version": 7, "value": 300 }
    assert cache.get_by_version(values, 8) == { "id": 3, "type": 1, "version": 7, "value": 300 }

def test2():
    # empty array
    cache = ValueCache(None, None)
    values = []
    assert cache.get_by_version(values, 1) == None

def test3():
    # connected to db
    def dict_factory(cursor, row):
        d = {}
        for idx, col in enumerate(cursor.description):
            d[col[0]] = row[idx]
        return d
    
    conn = sqlite3.connect("simple.sqlite")
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cache = ValueCache(conn, cursor)
    cache.get_value(838, 6)
    # should be cached
    value = cache.get_value(838, 6)
    assert value == { 'id': 838, 'type': 12, 'version': 6, 'value': None }
    value = cache.get_value(838, 24)
    assert value == { 'id': 838, 'type': 1, 'version': 24, 'value': '8' }
    value = cache.get_value(838, 12)
    assert value == { 'id': 838, 'type': 1, 'version': 12, 'value': '2' }

if __name__ == "__main__":
    test1()
    test2()
    test3()

            
            
        
        
    