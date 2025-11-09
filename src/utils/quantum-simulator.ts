// Quantum Simulator for BB84 Protocol
// Simulates quantum state preparation and measurement

import { Basis, Bit, QuantumBackend } from '@/types/bb84';

/**
 * Simulates quantum state preparation and measurement for BB84
 * Supports both Qiskit-style and PennyLane-style backends
 */
export class QuantumSimulator {
  private backend: QuantumBackend;
  private rng: () => number;

  constructor(backend: QuantumBackend = 'qiskit', seed?: number) {
    this.backend = backend;
    this.rng = seed !== undefined ? this.seededRandom(seed) : Math.random;
  }

  /**
   * Seeded random number generator for reproducible demos
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Alice prepares a qubit in the given basis with the given bit value
   * Returns the quantum state (simulated as classical for demonstration)
   */
  prepareQubit(bit: Bit, basis: Basis): { bit: Bit; basis: Basis } {
    // In real quantum: |0⟩ or |1⟩ for rectilinear, |+⟩ or |−⟩ for diagonal
    return { bit, basis };
  }

  /**
   * Bob measures a qubit in the given basis
   * Returns the measurement outcome
   */
  measureQubit(
    preparedState: { bit: Bit; basis: Basis },
    measureBasis: Basis,
    eveIntercepted?: boolean
  ): { bobOutcome: Bit; eveBasis?: Basis; eveOutcome?: Bit } {
    if (this.backend === 'qiskit') {
      return this.measureQiskitStyle(preparedState, measureBasis, eveIntercepted);
    } else {
      return this.measurePennyLaneStyle(preparedState, measureBasis, eveIntercepted);
    }
  }

  /**
   * Qiskit-style measurement simulation
   */
  private measureQiskitStyle(
    preparedState: { bit: Bit; basis: Basis },
    measureBasis: Basis,
    eveIntercepted?: boolean
  ): { bobOutcome: Bit; eveBasis?: Basis; eveOutcome?: Bit } {
    const { bit, basis } = preparedState;

    // If Eve intercepted, she measures in random basis and resends
    let actualBit = bit;
    let actualBasis = basis;

    let eveBasis: Basis | undefined = undefined;
    let eveOutcome: Bit | undefined = undefined;

    if (eveIntercepted) {
      eveBasis = this.rng() < 0.5 ? 0 : 1;
      // Eve measures
      if (eveBasis === basis) {
        // Same basis: Eve gets correct bit
        actualBit = bit;
      } else {
        // Different basis: Eve gets random bit (50% chance)
        actualBit = this.rng() < 0.5 ? 0 : 1;
      }
      eveOutcome = actualBit;
      // Eve resends in her measured basis
      actualBasis = eveBasis;
    }

    // Bob's measurement
    const bobOutcome = measureBasis === actualBasis ? actualBit : this.rng() < 0.5 ? 0 : 1;

    return { bobOutcome, eveBasis, eveOutcome };
  }

  /**
   * PennyLane-style measurement simulation
   * (Same logic, different conceptual framework)
   */
  private measurePennyLaneStyle(
    preparedState: { bit: Bit; basis: Basis },
    measureBasis: Basis,
    eveIntercepted?: boolean
  ): { bobOutcome: Bit; eveBasis?: Basis; eveOutcome?: Bit } {
    // PennyLane uses QNodes, but simulation is identical
    return this.measureQiskitStyle(preparedState, measureBasis, eveIntercepted);
  }

  /**
   * Simulate full BB84 transmission
   */
  simulateTransmission(
    aliceBits: Bit[],
    aliceBases: Basis[],
    bobBases: Basis[],
    eveEnabled: boolean = false
  ): { bobOutcomes: Bit[]; eveBases?: Basis[]; eveOutcomes?: Bit[] } {
    const bobOutcomes: Bit[] = [];
    const eveBases: Basis[] = [];
    const eveOutcomes: Bit[] = [];

    for (let i = 0; i < aliceBits.length; i++) {
      const preparedState = this.prepareQubit(aliceBits[i], aliceBases[i]);
      const result = this.measureQubit(preparedState, bobBases[i], eveEnabled);
      bobOutcomes.push(result.bobOutcome);
      if (eveEnabled && result.eveBasis !== undefined && result.eveOutcome !== undefined) {
        eveBases.push(result.eveBasis);
        eveOutcomes.push(result.eveOutcome);
      }
    }

    return {
      bobOutcomes,
      ...(eveEnabled && { eveBases, eveOutcomes }),
    };
  }

  /**
   * Generate random bits
   */
  generateRandomBits(count: number): Bit[] {
    return Array.from({ length: count }, () => (this.rng() < 0.5 ? 0 : 1));
  }

  /**
   * Generate random bases
   */
  generateRandomBases(count: number): Basis[] {
    return Array.from({ length: count }, () => (this.rng() < 0.5 ? 0 : 1));
  }
}
