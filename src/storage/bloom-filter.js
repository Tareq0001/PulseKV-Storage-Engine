/**
 * Probabilistic Bloom Filter
 * Uses k independent Murmur-inspired hash functions over an m-bit array.
 */
class BloomFilter {
  constructor(size = 128, hashCount = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(size / 8));
  }

  add(key) {
    const hashes = this.getHashes(key);
    hashes.forEach(bitIdx => {
      const byteIdx = Math.floor(bitIdx / 8);
      const bitOffset = bitIdx % 8;
      this.bitArray[byteIdx] |= (1 << bitOffset);
    });
  }

  mightContain(key) {
    const hashes = this.getHashes(key);
    for (const bitIdx of hashes) {
      const byteIdx = Math.floor(bitIdx / 8);
      const bitOffset = bitIdx % 8;
      if ((this.bitArray[byteIdx] & (1 << bitOffset)) === 0) {
        return false; // Definitely not in set (zero false negatives)
      }
    }
    return true; // Might be in set
  }

  getHashes(key) {
    const indices = [];
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < key.length; i++) {
      h1 = ((h1 << 5) - h1 + key.charCodeAt(i)) | 0;
      h2 = ((h2 << 7) - h2 + key.charCodeAt(i) * 31) | 0;
    }
    h1 = Math.abs(h1);
    h2 = Math.abs(h2);

    // Double hashing: hash_i(key) = (h1 + i * h2) % m
    for (let i = 0; i < this.hashCount; i++) {
      indices.push((h1 + i * h2) % this.size);
    }
    return indices;
  }

  getBitArrayVisualization() {
    let bits = [];
    for (let i = 0; i < this.size; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitOffset = i % 8;
      bits.push((this.bitArray[byteIdx] & (1 << bitOffset)) !== 0 ? 1 : 0);
    }
    return bits;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BloomFilter };
}
