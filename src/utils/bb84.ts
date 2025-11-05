import { Basis } from '@/types/quantum';

// Generate random bits
export const generateRandomBits = (n: number): number[] => {
  return Array.from({ length: n }, () => Math.random() < 0.5 ? 0 : 1);
};

// Generate random bases
export const generateRandomBases = (n: number): Basis[] => {
  return Array.from({ length: n }, () => 
    Math.random() < 0.5 ? 'rectilinear' : 'diagonal'
  );
};

// Encode a qubit based on bit value and basis
export const encodeQubit = (bit: number, basis: Basis): number[] => {
  // Returns [alpha, beta] complex amplitudes representation
  if (basis === 'rectilinear') {
    // |0⟩ = [1, 0], |1⟩ = [0, 1]
    return bit === 0 ? [1, 0] : [0, 1];
  } else {
    // |+⟩ = [1/√2, 1/√2], |-⟩ = [1/√2, -1/√2]
    const sqrt2 = Math.sqrt(2);
    return bit === 0 ? [1/sqrt2, 1/sqrt2] : [1/sqrt2, -1/sqrt2];
  }
};

// Measure a qubit in a given basis
export const measureQubit = (qubit: number[], basis: Basis, withEve: boolean = false): number => {
  // Simulate measurement with possible Eve interference
  if (withEve) {
    // Eve randomly chooses a basis to measure
    const eveBasis: Basis = Math.random() < 0.5 ? 'rectilinear' : 'diagonal';
    // Eve measures, then re-encodes and sends
    const eveMeasurement = performMeasurement(qubit, eveBasis);
    // Re-encode what Eve measured
    qubit = encodeQubit(eveMeasurement, eveBasis);
  }
  
  return performMeasurement(qubit, basis);
};

const performMeasurement = (qubit: number[], basis: Basis): number => {
  const [alpha, beta] = qubit;
  
  if (basis === 'rectilinear') {
    // Probability of measuring |0⟩
    const prob0 = alpha * alpha;
    return Math.random() < prob0 ? 0 : 1;
  } else {
    // Transform to diagonal basis
    const sqrt2 = Math.sqrt(2);
    const probPlus = ((alpha + beta) / sqrt2) ** 2;
    return Math.random() < probPlus ? 0 : 1;
  }
};

// Sift keys based on matching bases
export const siftKeys = (
  aliceBits: number[],
  aliceBases: Basis[],
  bobBases: Basis[]
): { siftedAlice: number[]; siftedBob: number[]; keepMask: boolean[] } => {
  const keepMask = aliceBases.map((ab, i) => ab === bobBases[i]);
  const siftedAlice = aliceBits.filter((_, i) => keepMask[i]);
  // Bob's sifted key would be the same if no errors
  const siftedBob = [...siftedAlice]; // Initially the same
  
  return { siftedAlice, siftedBob, keepMask };
};

// Calculate QBER from sample
export const calculateQBER = (
  aliceSample: number[],
  bobSample: number[]
): number => {
  if (aliceSample.length === 0) return 0;
  
  let errors = 0;
  for (let i = 0; i < aliceSample.length; i++) {
    if (aliceSample[i] !== bobSample[i]) {
      errors++;
    }
  }
  
  return errors / aliceSample.length;
};

// Simple parity-based error correction
export const errorCorrection = (
  aliceKey: number[],
  bobKey: number[]
): { correctedAlice: number[]; correctedBob: number[]; parityExchanges: number; bitsDiscarded: number } => {
  let parityExchanges = 0;
  let bitsDiscarded = 0;
  
  const correctedAlice = [...aliceKey];
  const correctedBob = [...bobKey];
  
  // Simple block parity checking
  const blockSize = 4;
  for (let i = 0; i < aliceKey.length; i += blockSize) {
    const aliceBlock = correctedAlice.slice(i, Math.min(i + blockSize, aliceKey.length));
    const bobBlock = correctedBob.slice(i, Math.min(i + blockSize, bobKey.length));
    
    const aliceParity = aliceBlock.reduce((sum, bit) => sum ^ bit, 0);
    const bobParity = bobBlock.reduce((sum, bit) => sum ^ bit, 0);
    
    parityExchanges++;
    
    if (aliceParity !== bobParity) {
      // Error detected, discard this block
      bitsDiscarded += aliceBlock.length;
      for (let j = 0; j < aliceBlock.length; j++) {
        correctedAlice[i + j] = -1; // Mark for removal
        correctedBob[i + j] = -1;
      }
    }
  }
  
  // Remove discarded bits
  const finalAlice = correctedAlice.filter(b => b !== -1);
  const finalBob = correctedBob.filter(b => b !== -1);
  
  return {
    correctedAlice: finalAlice,
    correctedBob: finalBob,
    parityExchanges,
    bitsDiscarded
  };
};

// Privacy amplification using simple universal hash
export const privacyAmplification = (
  key: number[],
  outputLength: number
): number[] => {
  if (key.length === 0) return [];
  
  // Simple Toeplitz matrix hash simulation
  // In practice, this would use a random Toeplitz matrix
  const hash: number[] = [];
  
  for (let i = 0; i < outputLength && i < key.length; i++) {
    // Simple hash: XOR of different positions
    let bit = 0;
    for (let j = 0; j < Math.min(8, key.length); j++) {
      bit ^= key[(i + j * 7) % key.length];
    }
    hash.push(bit);
  }
  
  return hash;
};

// Generate key commitment (hash)
export const generateCommitment = (key: number[]): string => {
  const keyString = key.join('');
  // Simple hash for demonstration
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    hash = ((hash << 5) - hash) + keyString.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
};

// XOR cipher for chat encryption
export const encryptMessage = (message: string, key: number[]): string => {
  if (key.length === 0) return message;
  
  const encrypted = message.split('').map((char, i) => {
    const charCode = char.charCodeAt(0);
    const keyBit = key[i % key.length];
    return String.fromCharCode(charCode ^ keyBit);
  });
  
  return btoa(encrypted.join('')); // Base64 encode
};

export const decryptMessage = (encrypted: string, key: number[]): string => {
  if (key.length === 0) return encrypted;
  
  try {
    const decoded = atob(encrypted);
    const decrypted = decoded.split('').map((char, i) => {
      const charCode = char.charCodeAt(0);
      const keyBit = key[i % key.length];
      return String.fromCharCode(charCode ^ keyBit);
    });
    
    return decrypted.join('');
  } catch {
    return encrypted;
  }
};
