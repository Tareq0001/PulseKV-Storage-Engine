/**
 * Leveled Compaction Engine
 * Merges overlapping L0 SSTables into non-overlapping L1 SSTables, eliminating stale versions and tombstones.
 */
class Compactor {
  constructor() {}

  compactL0toL1(l0Tables, l1Tables, generateSSTableId) {
    const { SSTable } = typeof require !== 'undefined' ? require('./sstable') : window;

    // Multi-way merge of all entries in L0 and existing L1
    const allTables = [...l0Tables, ...l1Tables];
    const latestEntriesMap = new Map();

    // Iterate oldest to newest so newest overwrites oldest
    allTables.sort((a, b) => a.createdAt - b.createdAt);

    allTables.forEach(table => {
      table.entries.forEach(entry => {
        latestEntriesMap.set(entry.key, entry);
      });
    });

    // Filter out tombstones and sort keys lexicographically
    const compactedEntries = [];
    const sortedKeys = Array.from(latestEntriesMap.keys()).sort();

    sortedKeys.forEach(k => {
      const entry = latestEntriesMap.get(k);
      if (!entry.isTombstone) {
        compactedEntries.push(entry);
      }
    });

    // Chunk into new L1 SSTables (e.g., 6 entries per SSTable)
    const newL1Tables = [];
    const chunkSize = 6;
    for (let i = 0; i < compactedEntries.length; i += chunkSize) {
      const chunk = compactedEntries.slice(i, i + chunkSize);
      const sstable = new SSTable(generateSSTableId(1), 1, chunk);
      newL1Tables.push(sstable);
    }

    return {
      newL1Tables,
      purgedTombstones: sortedKeys.filter(k => latestEntriesMap.get(k).isTombstone).length,
      compactedCount: compactedEntries.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Compactor };
}
