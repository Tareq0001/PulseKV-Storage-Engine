/**
 * Sorted String Table (SSTable)
 * Immutable on-disk file representation with Sparse Index and Bloom Filter.
 */
class SSTable {
  constructor(id, level, sortedEntries) {
    const { BloomFilter } = typeof require !== 'undefined' ? require('./bloom-filter') : window;

    this.id = id;
    this.level = level; // 0 = L0, 1 = L1, etc.
    this.createdAt = Date.now();
    this.entries = [...sortedEntries];
    this.bloomFilter = new BloomFilter(128, 3);
    this.sparseIndex = new Map();

    // Populate Bloom Filter & Sparse Index (every 2 entries)
    this.entries.forEach((entry, idx) => {
      this.bloomFilter.add(entry.key);
      if (idx % 2 === 0 || idx === this.entries.length - 1) {
        this.sparseIndex.set(entry.key, idx);
      }
    });

    this.minKey = this.entries.length > 0 ? this.entries[0].key : null;
    this.maxKey = this.entries.length > 0 ? this.entries[this.entries.length - 1].key : null;
  }

  get(key) {
    // 1. Fast Bloom Filter Check
    if (!this.bloomFilter.mightContain(key)) {
      return null; // Definitely not in this SSTable
    }

    // 2. Binary Search over sorted entries
    let left = 0;
    let right = this.entries.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midKey = this.entries[mid].key;

      if (midKey === key) {
        return this.entries[mid];
      } else if (midKey < key) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return null;
  }

  scan(startKey, endKey) {
    return this.entries.filter(e => {
      if (startKey && e.key < startKey) return false;
      if (endKey && e.key > endKey) return false;
      return true;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SSTable };
}
