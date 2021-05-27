from cache import LruCache

def expectEqual(val1, val2):
    if val1 == val2:
        print('test passed: {val1} is equal to {val2}'.format(val1=val1, val2=val2))
    else:
        print('test failed: {val1} is not equal to {val2}'.format(val1=val1, val2=val2))


cache = LruCache(3)
cache[1] = 1
cache[2] = 2
cache[3] = 3
cache[4] = 4
assert 3 in cache
expectEqual(cache[3], 3)
assert 1 not in cache
expectEqual(cache[1], None)
cache[2] = 5
cache[4] = 7
assert 4 in cache
expectEqual(cache[4], 7)
cache[5] = 8
assert 3 not in cache
expectEqual(cache[3], None)
assert 4 in cache
expectEqual(cache[4], 7)
cache[6] = 9
assert 2 not in cache
expectEqual(cache[2], None)

