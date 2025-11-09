# BB84 Quantum Key Distribution Implementation

## Overview

This application implements a complete BB84 Quantum Key Distribution protocol simulation with:
- **Room-based session coordination** with authentication
- **Role selection** (Alice/Bob) with enforcement
- **WebRTC peer-to-peer** authenticated classical channel
- **Quantum simulation** backends (Qiskit-style and PennyLane-style)
- **Full BB84 protocol** with all steps
- **Eavesdropper (Eve)** simulation
- **Post-key encrypted chat** using the derived quantum key

## Architecture

### Components

1. **RoomSetup** - Create or join a room with passcode authentication
2. **ConnectionSetup** - WebRTC signaling and connection establishment
3. **RoleSelection** - Choose Alice (sender) or Bob (receiver) role
4. **BB84Protocol** - Main protocol implementation with step-by-step UI
5. **SecureChat** - Time-boxed encrypted chat using the final key

### Utilities

1. **quantum-simulator.ts** - Quantum state preparation and measurement
2. **bb84-protocol.ts** - Sifting, QBER, error correction, privacy amplification
3. **encryption.ts** - Key-based encryption for post-protocol chat
4. **webrtc.ts** - WebRTC connection management

## Protocol Flow

### 1. Setup Phase
- User creates or joins a room with unique ID and passcode
- WebRTC connection established with authenticated classical channel
- Roles selected (one Alice, one Bob)

### 2. Preparation (Alice)
- Alice generates N random bits and random bases
- Encodes qubits in the quantum simulator
- Signals "prepared(N)" to Bob

### 3. Measurement (Bob)
- Bob generates random measurement bases
- Measures incoming qubits in the simulator
- Signals "measured(N)" to Alice

### 4. Sifting
- Alice and Bob exchange basis strings over authenticated channel
- Keep only bits where bases match
- Discard mismatched basis measurements
- **Result**: Sifted key (typically ~50% of original)

### 5. QBER Estimation
- Alice selects random sample of sifted bits
- Both reveal sample bits and compare
- Calculate Quantum Bit Error Rate (QBER)
- **Threshold**: Default 11% for BB84
- If QBER > threshold → **ABORT** (likely eavesdropping)
- Remove sampled bits from key

### 6. Error Correction
- Use parity-based block reconciliation (Cascade-style)
- Exchange parity information to detect and correct errors
- Track bits revealed during correction
- **Result**: Synchronized keys

### 7. Privacy Amplification
- Apply universal hashing (Toeplitz matrix simulation)
- Compress key to remove Eve's partial information
- Output length based on: n(1 - h(QBER)) - leaked_bits - security_margin
- **Result**: Information-theoretically secure key

### 8. Key Verification
- Exchange cryptographic commitments
- Verify keys match without revealing them
- If mismatch → **ABORT**

### 9. Secure Chat
- 2-minute time-boxed chat session
- Messages encrypted with derived quantum key
- XOR cipher with random IV (simplified for demo)
- Auto-close after timeout

## Configuration Options

### Quantum Backend
- **Qiskit-style**: Standard quantum circuit simulation
- **PennyLane-style**: QNode-based simulation (same logic, different framework)

### Protocol Parameters
- **Number of Qubits**: 100, 200, or 500
- **Sample Size**: 10, 20, or 50 bits for QBER estimation
- **QBER Threshold**: Default 11% (configurable)

### Eavesdropper Mode
- **Enable Eve**: Simulates intercept-measure-resend attack
- Eve measures in random basis and resends
- Increases QBER, typically causing protocol abort

## Security Features

### Authenticated Classical Channel
- WebRTC with passcode-protected room
- All protocol messages authenticated
- Prevents man-in-the-middle attacks on classical communication

### QBER Detection
- Detects eavesdropping through error rate
- Eve's random basis choices introduce ~25% errors
- Protocol aborts if QBER exceeds threshold

### Error Correction
- Reconciles remaining errors from noise
- Tracks information leaked during correction

### Privacy Amplification
- Removes Eve's partial information
- Information-theoretic security guarantee
- Final key length based on proven formulas

### Key Verification
- Cryptographic commitment prevents key mismatch
- Ensures both parties have identical key

## Message Types

### Protocol Messages (over WebRTC DataChannel)
```typescript
- prepared: Alice signals qubits ready
- measured: Bob signals measurement complete
- announce_bases: Exchange basis strings
- sifting_result: Share keep mask
- qber_request: Request sample comparison
- qber_response: Send sample bits
- accept_or_abort: QBER decision
- error_correction: Parity exchange
- privacy_amplification: Hash parameters
- final_key_commitment: Key verification
- final_key_confirmed: Verification result
- chat_message: Encrypted chat message
- chat_ended: Session termination
```

## UI Features

### Two-Panel Display
- **Alice Panel**: Shows bits, bases, preparation controls
- **Bob Panel**: Shows bases, outcomes, measurement controls
- Real-time status indicators

### Progress Tracking
- Step-by-step protocol visualization
- Current step highlighted
- Progress bars for key lengths

### Statistics Display
- Sifted key length and percentage
- QBER with threshold comparison
- Error correction statistics
- Privacy amplification compression ratio
- Final key length in bits and hex

### Visual Feedback
- Color-coded alerts (success/warning/error)
- Loading states for async operations
- Toast notifications for events
- Timer countdown for chat session

## Testing the Protocol

### Normal Operation (No Eve)
1. Create room as Alice
2. Join room as Bob
3. Alice: Click "Prepare & Send Qubits"
4. Bob: Click "Measure Qubits"
5. Both: Click "Sifting"
6. Alice: Click "QBER Check"
7. Both: Click "Error Correction"
8. Both: Click "Privacy Amplification"
9. Keys verified → Chat opens
10. Exchange encrypted messages for 2 minutes

### With Eavesdropper (Eve Enabled)
1. Enable "Enable Eve" toggle before starting
2. Follow same steps
3. QBER will be elevated (~25% instead of ~0-5%)
4. Protocol will abort at QBER check
5. Shows "QBER too high" error

## Implementation Notes

### Quantum Simulation
- Classical simulation of quantum states
- Perfect for demonstration and education
- Real quantum hardware would use actual qubits

### Error Correction
- Simplified Cascade-style algorithm
- Production systems use more sophisticated codes
- Demonstrates the concept effectively

### Privacy Amplification
- Simulated universal hashing
- Production would use proper Toeplitz matrices
- Compression ratios follow theoretical formulas

### Encryption
- Simple XOR cipher for demonstration
- Production should use AES-GCM or similar
- Shows principle of key-based encryption

## Security Considerations

### What This Demonstrates
✅ Quantum key distribution principles
✅ Eavesdropping detection via QBER
✅ Error correction and privacy amplification
✅ Information-theoretic security concepts
✅ Authenticated classical channel importance

### Production Requirements
⚠️ Real quantum hardware for true QKD
⚠️ Proper cryptographic primitives (not XOR)
⚠️ Secure random number generation
⚠️ Side-channel attack mitigation
⚠️ Formal security proofs

## Performance

### Typical Results (200 qubits, no Eve)
- Raw qubits: 200
- After sifting: ~100 bits (50%)
- Sample size: 20 bits
- QBER: 0-5%
- After error correction: ~80 bits
- Final key: 32-64 bits (depending on QBER)

### With Eve Enabled
- QBER: 20-30%
- Protocol aborts at threshold check
- No key generated

## Future Enhancements

- [ ] Multiple error correction algorithms
- [ ] Adjustable security parameters
- [ ] Detailed protocol statistics export
- [ ] Step-by-step animation mode
- [ ] Multi-round protocol support
- [ ] Real quantum hardware integration (IBM Quantum, etc.)
- [ ] Advanced privacy amplification methods
- [ ] Longer chat sessions with key refresh

## References

- Bennett & Brassard (1984): "Quantum Cryptography: Public key distribution and coin tossing"
- Shor & Preskill (2000): "Simple proof of security of the BB84 quantum key distribution protocol"
- Gottesman & Lo (2003): "Proof of security of quantum key distribution with two-way classical communications"

## License

Educational demonstration - not for production security use.
