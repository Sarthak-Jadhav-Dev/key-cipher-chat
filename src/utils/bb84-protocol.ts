// BB84 Protocol Implementation
// Handles sifting, QBER estimation, error correction, and privacy amplification

import { Bit, Basis, ErrorCorrectionStats, PrivacyAmplificationStats } from '@/types/bb84';

/**
 * Perform basis sifting - keep only bits where Alice and Bob used same basis
 */
export function performSifting(
  aliceBases: Basis[],
  bobBases: Basis[]
): boolean[] {
  const keepMask: boolean[] = [];
  for (let i = 0; i < aliceBases.length; i++) {
    keepMask.push(aliceBases[i] === bobBases[i]);
  }
  return keepMask;
}

/**
 * Extract sifted key using keep mask
 */
export function extractSiftedKey(bits: Bit[], keepMask: boolean[]): Bit[] {
  return bits.filter((_, i) => keepMask[i]);
}

/**
 * Select random sample indices for QBER estimation
 */
export function selectRandomSample(
  siftedLength: number,
  sampleSize: number,
  seed?: number
): number[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  const indices = Array.from({ length: siftedLength }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  return indices.slice(0, sampleSize).sort((a, b) => a - b);
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Calculate QBER from sample comparison
 */
export function calculateQBER(
  aliceSample: Bit[],
  bobSample: Bit[]
): number {
  if (aliceSample.length === 0) return 0;
  
  let errors = 0;
  for (let i = 0; i < aliceSample.length; i++) {
    if (aliceSample[i] !== bobSample[i]) {
      errors++;
    }
  }
  
  return errors / aliceSample.length;
}

/**
 * Remove sampled bits from key
 */
export function removeSampledBits(
  key: Bit[],
  sampleIndices: number[]
): Bit[] {
  return key.filter((_, i) => !sampleIndices.includes(i));
}

/**
 * Simple parity-based error correction (Cascade-style simplified)
 * Returns corrected key and statistics
 */
export function performErrorCorrection(
  aliceKey: Bit[],
  bobKey: Bit[],
  estimatedQBER: number
): ErrorCorrectionStats {
  const correctedBobKey = [...bobKey];
  let parityRounds = 0;
  let bitsRevealed = 0;
  
  // Count initial errors
  let initialErrors = 0;
  for (let i = 0; i < aliceKey.length; i++) {
    if (aliceKey[i] !== bobKey[i]) initialErrors++;
  }
  
  // Simple block parity correction
  const blockSize = Math.max(4, Math.ceil(1 / (2 * Math.max(estimatedQBER, 0.01))));
  
  for (let round = 0; round < 3; round++) {
    parityRounds++;
    let correctionsMade = false;
    
    for (let start = 0; start < aliceKey.length; start += blockSize) {
      const end = Math.min(start + blockSize, aliceKey.length);
      
      // Calculate parity
      let aliceParity = 0;
      let bobParity = 0;
      for (let i = start; i < end; i++) {
        aliceParity ^= aliceKey[i];
        bobParity ^= correctedBobKey[i];
      }
      bitsRevealed++;
      
      // If parity mismatch, binary search for error
      if (aliceParity !== bobParity) {
        correctionsMade = true;
        // Simple correction: flip middle bit (simplified for demo)
        const mid = Math.floor((start + end) / 2);
        if (mid < correctedBobKey.length) {
          correctedBobKey[mid] = correctedBobKey[mid] === 0 ? 1 : 0;
        }
      }
    }
    
    if (!correctionsMade) break;
  }
  
  return {
    initialErrors,
    parityRounds,
    bitsRevealed,
    correctedKey: correctedBobKey,
  };
}

/**
 * Privacy amplification using universal hashing (Toeplitz matrix)
 * Compresses key to remove Eve's partial information
 */
export function performPrivacyAmplification(
  key: Bit[],
  estimatedQBER: number,
  bitsRevealed: number
): PrivacyAmplificationStats {
  const inputLength = key.length;
  
  // Calculate output length using information-theoretic formula
  // Final key length ≈ n(1 - h(QBER)) - leaked bits - security parameter
  const h = estimatedQBER > 0 ? -estimatedQBER * Math.log2(estimatedQBER) - 
    (1 - estimatedQBER) * Math.log2(1 - estimatedQBER) : 0;
  
  const securityParameter = 64; // bits for security margin
  const outputLength = Math.max(
    32, // minimum 32 bits
    Math.floor(inputLength * (1 - h) - bitsRevealed - securityParameter)
  );
  
  // Generate Toeplitz matrix (simplified: use hash function)
  const amplifiedKey: Bit[] = [];
  const seed = key.reduce((acc, bit, i) => acc + bit * (i + 1), 0);
  const rng = seededRandom(seed);
  
  for (let i = 0; i < outputLength; i++) {
    // XOR subset of input bits (universal hash)
    let bit = 0;
    for (let j = 0; j < inputLength; j++) {
      if (rng() < 0.5) {
        bit ^= key[j];
      }
    }
    amplifiedKey.push(bit as Bit);
  }
  
  return {
    inputLength,
    outputLength,
    compressionRatio: outputLength / inputLength,
    amplifiedKey,
  };
}

/**
 * Generate commitment hash for key verification
 */
export function generateCommitment(key: Bit[]): string {
  const keyString = key.join('');
  // Simple hash (in production, use SHA-256)
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    hash = ((hash << 5) - hash) + keyString.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Verify commitment matches
 */
export function verifyCommitment(key: Bit[], commitment: string): boolean {
  return generateCommitment(key) === commitment;
}

/**
 * Convert bit array to hex string for display
 */
export function bitsToHex(bits: Bit[]): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4);
    while (nibble.length < 4) nibble.push(0);
    const value = nibble.reduce((acc, bit, j) => acc + bit * Math.pow(2, 3 - j), 0);
    hex += value.toString(16);
  }
  return hex;
}

/**
 * Convert bit array to bytes for encryption
 */
export function bitsToBytes(bits: Bit[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 1) {
      bytes[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
    }
  }
  return bytes;
}
