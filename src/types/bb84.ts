// BB84 Protocol Types and Interfaces

export type Basis = 0 | 1; // 0 = rectilinear (+), 1 = diagonal (×)
export type Bit = 0 | 1;
export type QuantumBackend = 'qiskit' | 'pennylane';

export interface BB84Config {
  numQubits: number;
  sampleSize: number;
  qberThreshold: number; // e.g., 0.11 for 11%
  backend: QuantumBackend;
  eveEnabled: boolean;
}

export interface ProtocolState {
  step: 'idle' | 'preparation' | 'measurement' | 'sifting' | 'qber' | 'error-correction' | 'privacy-amplification' | 'success' | 'aborted' | 'chat';
  aliceBits: Bit[];
  aliceBases: Basis[];
  bobBases: Basis[];
  bobOutcomes: Bit[];
  eveBases?: Basis[];
  eveOutcomes?: Bit[];
  keepMask: boolean[];
  siftedKey: Bit[];
  sampleIndices: number[];
  qber: number | null;
  ecStats: ErrorCorrectionStats | null;
  paStats: PrivacyAmplificationStats | null;
  finalKey: Bit[];
  abortReason: string | null;
}

export interface ErrorCorrectionStats {
  initialErrors: number;
  parityRounds: number;
  bitsRevealed: number;
  correctedKey: Bit[];
}

export interface PrivacyAmplificationStats {
  inputLength: number;
  outputLength: number;
  compressionRatio: number;
}

export interface RunSummary {
  rawLength: number;
  siftedLength: number;
  sampleSize: number;
  qber: number;
  threshold: number;
  aborted: boolean;
  ecStats: ErrorCorrectionStats | null;
  paStats: PrivacyAmplificationStats | null;
  finalKeyLength: number;
}

// WebRTC DataChannel message types
export type BB84Message =
  | { type: 'prepared'; numQubits: number; aliceBits: Bit[]; aliceBases: Basis[] }
  | { type: 'measured'; numQubits: number }
  | { type: 'announce_bases'; bases: Basis[] }
  | { type: 'sifting_result'; keepMask: boolean[] }
  | { type: 'qber_request'; sampleIndices: number[]; sampleBits: Bit[] }
  | { type: 'qber_response'; sampleBits: Bit[] }
  | { type: 'accept_or_abort'; accepted: boolean; qber: number }
  | { type: 'error_correction'; parityBits: number[]; blockIndex: number }
  | { type: 'error_correction_stats'; stats: ErrorCorrectionStats }
  | { type: 'privacy_amplification'; hashSeed: number[] }
  | { type: 'final_key_commitment'; commitment: string }
  | { type: 'final_key_confirmed'; match: boolean }
  | { type: 'chat_message'; encrypted: string; iv: string }
  | { type: 'chat_ended' };
