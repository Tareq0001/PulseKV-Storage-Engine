const assert = require('assert');
const { PulseKVEngine } = require('../src/engine');
const { BloomFilter } = require('../src/storage/bloom-filter');
const { WriteAheadLog } = require('../src/storage/wal');

console.log('--- RUNNING PULSEKV STORAGE ENGINE SUITE ---');

// Test 1: Write-Ahead Log Crash Recovery
{
  const wal = new WriteAheadLog();
  wal.append('PUT', 'user:101', 'Alice');
  wal.append('PUT', 'user:102', 'Bob');
  wal.append('DEL', 'user:101');

  const recovered = wal.recover();
  assert.strictEqual(recovered.length, 3);
  assert.strictEqual(recovered[0].key, 'user:101');
  assert.strictEqual(recovered[2].type, 'DEL');
  console.log('✓ Test 1 Passed: Write-Ahead Log Append & Recovery Verified');
}

// Test 2: Bloom Filter Zero False Negatives
{
  const filter = new BloomFilter(128, 3);
  const insertedKeys = ['alpha', 'beta', 'gamma', 'delta', 'omega'];
  insertedKeys.forEach(k => filter.add(k));

  // Must return true for all inserted keys
  insertedKeys.forEach(k => {
    assert.strictEqual(filter.mightContain(k), true);
  });

  // Non-inserted keys
  assert.strictEqual(filter.mightContain('non_existent_key_xyz_999'), false);
  console.log('✓ Test 2 Passed: Bloom Filter Zero False Negatives Guarantee Verified');
}

// Test 3: PulseKV Put, Get & MemTable Flush to SSTable
{
  const engine = new PulseKVEngine({ memtableCapacity: 3, l0Threshold: 5 });

  engine.put('k1', 'val_1');
  engine.put('k2', 'val_2');
  assert.strictEqual(engine.get('k1'), 'val_1');
  assert.strictEqual(engine.l0Tables.length, 0);

  // Exceed capacity -> triggers flush to L0
  engine.put('k3', 'val_3');
  assert.strictEqual(engine.l0Tables.length, 1);
  assert.strictEqual(engine.get('k1'), 'val_1');
  assert.strictEqual(engine.get('k3'), 'val_3');
  console.log('✓ Test 3 Passed: MemTable Flush to Immutable L0 SSTable Verified');
}

// Test 4: Tombstone Deletion & Leveled Compaction
{
  const engine = new PulseKVEngine({ memtableCapacity: 2, l0Threshold: 3 });

  engine.put('order:1', 'Pending');
  engine.put('order:2', 'Shipped'); // Flush 1 -> L0[0]

  engine.put('order:3', 'Delivered');
  engine.delete('order:1');          // Flush 2 -> L0[1]

  engine.put('order:4', 'Paid');
  engine.put('order:5', 'Returned'); // Flush 3 -> triggers Compaction to L1!

  assert.strictEqual(engine.get('order:1'), null); // Tombstone verified
  assert.strictEqual(engine.get('order:2'), 'Shipped');
  assert.strictEqual(engine.get('order:4'), 'Paid');
  assert.strictEqual(engine.l0Tables.length, 0); // L0 cleared
  assert.strictEqual(engine.l1Tables.length > 0, true); // Compacted to L1

  console.log('✓ Test 4 Passed: Leveled Compaction & Tombstone Purging Verified');
}

// Test 5: Range Scan across Storage Tiers
{
  const engine = new PulseKVEngine({ memtableCapacity: 2, l0Threshold: 5 });
  engine.put('a', '1');
  engine.put('b', '2'); // Flushed to SSTable
  engine.put('c', '3'); // In MemTable

  const scanResult = engine.scan('a', 'c');
  assert.strictEqual(scanResult.length, 3);
  assert.strictEqual(scanResult[0].key, 'a');
  assert.strictEqual(scanResult[2].key, 'c');
  console.log('✓ Test 5 Passed: Unified Range Scan across MemTable & SSTables Verified');
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
}
