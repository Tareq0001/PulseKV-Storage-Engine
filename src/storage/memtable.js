/**
 * MemTable (In-Memory Sorted Buffer)
 * Keeps keys lexicographically sorted in memory.
 */
class MemTable {
  constructor(capacity = 5) {
    this.capacity = capacity;
    this.entries = new Map(); // key -> { value, isTombstone, timestamp }
  }

  put(key, value) {
    this.entries.set(key, {
      value,
      isTombstone: false,
      timestamp: Date.now()
    });
  }

  delete(key) {
    this.entries.set(key, {
      value: null,
      isTombstone: true,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    return entry;
  }

  isFull() {
    return this.entries.size >= this.capacity;
  }

  getSortedEntries() {
    const sortedKeys = Array.from(this.entries.keys()).sort();
    return sortedKeys.map(k => ({
      key: k,
      ...this.entries.get(k)
    }));
  }

  size() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemTable };
}
