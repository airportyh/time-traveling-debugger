from cache import LruCache

def expectEqual(val1, val2):
    if val1 == val2:
        print('test passed: {val1} is equal to {val2}'.format(val1=val1, val2=val2))
    else:
        print('test failed: {val1} is not equal to {val2}'.format(val1=val1, val2=val2))


cache = LruCache(3)
cache.set(1, 1)
cache.set(2, 2)
cache.set(3, 3)
cache.set(4, 4)
expectEqual(cache.get(3), 3)
expectEqual(cache.get(1), None)
cache.set(2, 5)
cache.set(4, 7)
expectEqual(cache.get(4), 7)
cache.set(5, 8)
expectEqual(cache.get(3), None)
expectEqual(cache.get(4), 7)
cache.set(6, 9)
expectEqual(cache.get(2), None)

