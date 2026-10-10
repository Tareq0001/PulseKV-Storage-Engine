/**
 * Write-Ahead Log (WAL)
 * Sequential append-only durability log with record checksums.
 */
class WriteAheadLog {
  constructor() {
    this.records = []; // Array of serialized WAL records
  }

  append(type, key, value) {
    const timestamp = Date.now();
    const payload = `${type}:${key}:${value !== undefined ? value : ''}`;
    const checksum = this.calculateChecksum(payload);

    const record = {
      seq: this.records.length,
      type, // 'PUT' | 'DEL'
      key,
      value,
      timestamp,
      checksum
    };

    this.records.push(record);
    return record;
  }

  recover() {
    const validEntries = [];
    for (const record of this.records) {
      const payload = `${record.type}:${record.key}:${record.value !== undefined ? record.value : ''}`;
      if (this.calculateChecksum(payload) === record.checksum) {
        validEntries.push(record);
      } else {
        console.warn(`WAL record corrupted at sequence ${record.seq}`);
        break;
      }
    }
    return validEntries;
  }

  clear() {
    this.records = [];
  }

  calculateChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WriteAheadLog };
}
