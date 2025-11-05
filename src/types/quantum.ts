export type Role = 'alice' | 'bob' | null;
export type ProtocolStep = 'setup' | 'preparation' | 'measurement' | 'sifting' | 'qber' | 'error-correction' | 'privacy-amplification' | 'success' | 'aborted';
export type Basis = 'rectilinear' | 'diagonal';

export interface QuantumState {
  aliceBits: number[];
  aliceBases: Basis[];
  bobBases: Basis[];
  bobOutcomes: number[];
  keepMask: boolean[];
  siftedKey: number[];
  sampleIndices: number[];
  qber: number;
  threshold: number;
  finalKey: number[];
}

export interface ProtocolMessage {
  type: 'prepared' | 'measured' | 'announce_bases' | 'sifting_result' | 'qber_request' | 'qber_response' | 'accept_or_abort' | 'error_correction' | 'privacy_amplification' | 'final_key_commitment' | 'final_key_confirmed' | 'chat_message';
  data?: any;
}

export interface RoomState {
  roomId: string;
  passcode: string;
  aliceConnected: boolean;
  bobConnected: boolean;
  currentStep: ProtocolStep;
}

export interface RunSummary {
  rawLength: number;
  siftedLength: number;
  sampleSize: number;
  qber: number;
  threshold: number;
  aborted: boolean;
  ecStats?: {
    parityExchanges: number;
    bitsDiscarded: number;
  };
  paStats?: {
    inputLength: number;
    outputLength: number;
  };
  finalKeyLength: number;
}
