/**
 * PulseKV Unified Storage Engine
 * Coordinates WAL, MemTable, SSTables, Bloom Filters, and Compaction.
 */
class PulseKVEngine {
  constructor(options = {}) {
    const { WriteAheadLog } = typeof require !== 'undefined' ? require('./storage/wal') : window;
    const { MemTable } = typeof require !== 'undefined' ? require('./storage/memtable') : window;
    const { SSTable } = typeof require !== 'undefined' ? require('./storage/sstable') : window;
    const { Compactor } = typeof require !== 'undefined' ? require('./storage/compaction') : window;

    this.wal = new WriteAheadLog();
    this.memtableCapacity = options.memtableCapacity || 4;
    this.memtable = new MemTable(this.memtableCapacity);
    this.l0Tables = []; // Level 0 SSTables (can have overlapping key ranges)
    this.l1Tables = []; // Level 1 SSTables (non-overlapping key ranges)
    this.compactor = new Compactor();
    this.sstableCounter = 1;
    this.l0Threshold = options.l0Threshold || 3; // Trigger compaction when L0 >= 3 tables
  }

  generateSSTableId(level) {
    return `sst_L${level}_${this.sstableCounter++}`;
  }

  put(key, value) {
    // 1. Write to WAL for durability
    this.wal.append('PUT', key, value);

    // 2. Write to MemTable
    this.memtable.put(key, value);

    // 3. Flush to L0 SSTable if MemTable reaches capacity
    if (this.memtable.isFull()) {
      this.flushMemTable();
    }
  }

  delete(key) {
    // 1. Write Tombstone to WAL
    this.wal.append('DEL', key);

    // 2. Write Tombstone to MemTable
    this.memtable.delete(key);

    if (this.memtable.isFull()) {
      this.flushMemTable();
    }
  }

  get(key) {
    // Phase 1: Check In-Memory MemTable
    const memEntry = this.memtable.get(key);
    if (memEntry) {
      return memEntry.isTombstone ? null : memEntry.value;
    }

    // Phase 2: Check L0 SSTables (from newest to oldest)
    for (let i = this.l0Tables.length - 1; i >= 0; i--) {
      const entry = this.l0Tables[i].get(key);
      if (entry) {
        return entry.isTombstone ? null : entry.value;
      }
    }

    // Phase 3: Check L1 SSTables
    for (const table of this.l1Tables) {
      const entry = table.get(key);
      if (entry) {
        return entry.isTombstone ? null : entry.value;
      }
    }

    return null; // Key not found
  }

  flushMemTable() {
    const { SSTable } = typeof require !== 'undefined' ? require('./storage/sstable') : window;
    const sortedEntries = this.memtable.getSortedEntries();
    if (sortedEntries.length === 0) return;

    const sstable = new SSTable(this.generateSSTableId(0), 0, sortedEntries);
    this.l0Tables.push(sstable);

    // Clear MemTable and WAL after durable SSTable creation
    this.memtable.clear();
    this.wal.clear();

    // Check if L0 requires Compaction
    if (this.l0Tables.length >= this.l0Threshold) {
      this.compact();
    }
  }

  compact() {
    const result = this.compactor.compactL0toL1(
      this.l0Tables,
      this.l1Tables,
      (lvl) => this.generateSSTableId(lvl)
    );
    this.l0Tables = [];
    this.l1Tables = result.newL1Tables;
    return result;
  }

  scan(startKey, endKey) {
    const map = new Map();

    // Scan L1
    this.l1Tables.forEach(t => {
      t.scan(startKey, endKey).forEach(e => map.set(e.key, e));
    });

    // Scan L0
    this.l0Tables.forEach(t => {
      t.scan(startKey, endKey).forEach(e => map.set(e.key, e));
    });

    // Scan MemTable
    this.memtable.getSortedEntries().forEach(e => {
      if ((!startKey || e.key >= startKey) && (!endKey || e.key <= endKey)) {
        map.set(e.key, e);
      }
    });

    return Array.from(map.values())
      .filter(e => !e.isTombstone)
      .sort((a, b) => a.key.localeCompare(b.key));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PulseKVEngine };
}
