class LruCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.dict = {}
        self.linkedList = LinkedList()

    # similar to the Map API, the key can be a value of any type
    def set(self, key, value):
        currentNode = self.dict.get(key)
        newNode = Node(key, value)
        if currentNode:
            self.linkedList.remove(currentNode)
        else:
            if self.size() == self.capacity:
                lruNode = self.linkedList.tail
                self.linkedList.remove(lruNode)
                del self.dict[lruNode.key]
        self.linkedList.add(newNode)
        self.dict[key] = newNode
        

    # similar to the Map API
    def get(self, key):
        node = self.dict.get(key)
        if node:
            self.linkedList.remove(node)
            self.linkedList.add(node)
            return node.value
        else:
            return None

    # returns the current number of entries in the map    
    def size(self):
        return len(self.dict)

class Node:
    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
    
    # add after head
    def add(self, node):
        currentFirstNode = self.head
        self.head = node
        if currentFirstNode:
            node.next = currentFirstNode
            currentFirstNode.prev = node
        else:
            self.tail = node
        
    
    # remove node
    def remove(self, node):
        if self.head.key == node.key:
            self.head = self.head.next
        elif self.tail.key == node.key:
            self.tail = self.tail.prev
        prevNode = node.prev
        nextNode = node.next
        if prevNode:
            prevNode.next = nextNode
        if nextNode:
            nextNode.prev = prevNode
