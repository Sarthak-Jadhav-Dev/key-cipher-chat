import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Shield, AlertTriangle, CheckCircle, Send, Radio } from 'lucide-react';
import { Role } from '@/types/quantum';
import { BB84Config, ProtocolState, BB84Message, Bit, Basis } from '@/types/bb84';
import { QuantumSimulator } from '@/utils/quantum-simulator';
import {
  performSifting,
  extractSiftedKey,
  selectRandomSample,
  calculateQBER,
  removeSampledBits,
  performErrorCorrection,
  performPrivacyAmplification,
  generateCommitment,
  verifyCommitment,
  bitsToHex,
} from '@/utils/bb84-protocol';
import { WebRTCConnection } from '@/utils/webrtc';
import { useToast } from '@/hooks/use-toast';
import SecureChat from './SecureChat';
import Qubit from './Qubit';
import SiftedQubitDisplay from './SiftedQubitDisplay';
import AnimatedCounter from './AnimatedCounter';

interface BB84ProtocolProps {
  role: Role;
  connection: WebRTCConnection;
}

const BB84Protocol = ({ role, connection }: BB84ProtocolProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<BB84Config>({
    numQubits: 200,
    sampleSize: 20,
    qberThreshold: 0.11,
    backend: 'qiskit',
    eveEnabled: false,
  });

  const [state, setState] = useState<ProtocolState>({
    step: 'idle',
    aliceBits: [],
    aliceBases: [],
    bobBases: [],
    bobOutcomes: [],
    keepMask: [],
    siftedKey: [],
    sampleIndices: [],
    qber: null,
    ecStats: null,
    paStats: null,
    finalKey: [],
    abortReason: null,
  });

  const [simulator] = useState(() => new QuantumSimulator(config.backend));
  const [loading, setLoading] = useState(false);
  const [peerReady, setPeerReady] = useState(false);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (data: BB84Message) => {
      console.log('Received BB84 message:', data.type);

      switch (data.type) {
        case 'prepared':
          if (role === 'bob') {
            setState(prev => ({
              ...prev,
              aliceBits: data.aliceBits,
              aliceBases: data.aliceBases,
            }));
            setPeerReady(true);
            toast({
              title: 'Alice Prepared Qubits',
              description: `${data.numQubits} qubits ready for measurement`,
            });
          }
          break;

        case 'measured':
          if (role === 'alice') {
            setPeerReady(true);
            setState(prev => ({ ...prev, step: 'sifting' }));
          }
          break;

        case 'announce_bases':
          handleBasesReceived(data.bases);
          break;

        case 'sifting_result':
          handleSiftingResult(data.keepMask);
          break;

        case 'qber_request':
          handleQBERRequest(data.sampleIndices, data.sampleBits);
          break;

        case 'qber_response':
          handleQBERResponse(data.sampleBits);
          break;

        case 'accept_or_abort':
          handleAcceptOrAbort(data.accepted, data.qber);
          break;

        case 'error_correction':
          // Handle error correction messages
          break;

        case 'privacy_amplification':
          // Handle privacy amplification
          break;

        case 'final_key_commitment':
          handleKeyCommitment(data.commitment);
          break;

        case 'final_key_confirmed':
          if (data.match) {
            setState(prev => ({ ...prev, step: 'success' }));
            toast({
              title: 'Key Exchange Successful!',
              description: 'Secure key established. Starting chat...',
            });
            setTimeout(() => {
              setState(prev => ({ ...prev, step: 'chat' }));
            }, 2000);
          } else {
            handleAbort('Key commitment mismatch');
          }
          break;
      }
    };

    connection.onMessage(handleMessage);
  }, [role, connection, toast]);

  // Alice: Prepare qubits
  const handlePrepare = useCallback(() => {
    if (role !== 'alice') return;
    setLoading(true);

    setTimeout(() => {
      const aliceBits = simulator.generateRandomBits(config.numQubits);
      const aliceBases = simulator.generateRandomBases(config.numQubits);

      setState(prev => ({
        ...prev,
        step: 'preparation',
        aliceBits,
        aliceBases,
      }));

      connection.sendMessage({
        type: 'prepared',
        numQubits: config.numQubits,
        // In a real quantum channel, qubits would be sent.
        // For simulation, we send the classical information Bob needs to simulate the measurement.
        aliceBits: aliceBits,
        aliceBases: aliceBases,
      });

      setLoading(false);
      toast({
        title: 'Qubits Prepared',
        description: `${config.numQubits} qubits encoded and sent`,
      });
    }, 1000);
  }, [role, config.numQubits, simulator, connection, toast]);

  // Bob: Measure qubits
  const handleMeasure = useCallback(() => {
    if (role !== 'bob' || !peerReady) return;
    setLoading(true);

    setTimeout(() => {
      const bobBases = simulator.generateRandomBases(config.numQubits);
      
      // In a real scenario, Alice would have sent quantum states.
      // Here, we simulate the entire transmission at once for Bob's measurement step.
      const transmissionResult = simulator.simulateTransmission(
        state.aliceBits, // This needs to be available; requires a state change or message
        state.aliceBases,
        bobBases,
        config.eveEnabled
      );

      setState(prev => ({
        ...prev,
        step: 'measurement',
        bobBases,
        bobOutcomes: transmissionResult.bobOutcomes,
        ...(transmissionResult.eveBases && { eveBases: transmissionResult.eveBases }),
        ...(transmissionResult.eveOutcomes && { eveOutcomes: transmissionResult.eveOutcomes }),
      }));

      connection.sendMessage({
        type: 'measured',
        numQubits: config.numQubits,
      });

      setLoading(false);
      toast({
        title: 'Qubits Measured',
        description: `${config.numQubits} qubits measured`,
      });
    }, 1000);
  }, [role, peerReady, config.numQubits, simulator, connection, toast]);

  // Sifting: Exchange bases
  const handleSifting = useCallback(() => {
    setLoading(true);

    setTimeout(() => {
      if (role === 'alice') {
        // Alice announces her bases
        connection.sendMessage({
          type: 'announce_bases',
          bases: state.aliceBases,
        });
      } else {
        // Bob announces his bases
        connection.sendMessage({
          type: 'announce_bases',
          bases: state.bobBases,
        });
      }
      setLoading(false);
    }, 500);
  }, [role, state.aliceBases, state.bobBases, connection]);

  const handleBasesReceived = (peerBases: Basis[]) => {
    setState(prev => {
      const myBases = role === 'alice' ? prev.aliceBases : prev.bobBases;
      const keepMask = performSifting(myBases, peerBases);
      const myBits = role === 'alice' ? prev.aliceBits : prev.bobOutcomes;
      const siftedKey = extractSiftedKey(myBits, keepMask);

      if (role === 'alice') {
        // Alice sends sifting result to Bob
        connection.sendMessage({
          type: 'sifting_result',
          keepMask,
        });
      }

      toast({
        title: 'Sifting Complete',
        description: `Kept ${siftedKey.length} bits from ${myBits.length}`,
      });

      return {
        ...prev,
        keepMask,
        siftedKey,
        step: 'qber',
      };
    });
  };

  const handleSiftingResult = (keepMask: boolean[]) => {
    if (role === 'bob') {
      setState(prev => {
        const siftedKey = extractSiftedKey(prev.bobOutcomes, keepMask);
        return {
          ...prev,
          keepMask,
          siftedKey,
          step: 'qber',
        };
      });
    }
  };

  // QBER Estimation
  const handleQBEREstimation = useCallback(() => {
    if (role !== 'alice') return;
    setLoading(true);

    setTimeout(() => {
      const sampleIndices = selectRandomSample(state.siftedKey.length, config.sampleSize);
      const sampleBits = sampleIndices.map(i => state.siftedKey[i]);

      setState(prev => ({ ...prev, sampleIndices }));

      connection.sendMessage({
        type: 'qber_request',
        sampleIndices,
        sampleBits,
      });

      setLoading(false);
    }, 500);
  }, [role, state.siftedKey, config.sampleSize, connection]);

  const handleQBERRequest = (sampleIndices: number[], aliceSample: Bit[]) => {
    if (role !== 'bob') return;

    const bobSample = sampleIndices.map(i => state.siftedKey[i]);

    connection.sendMessage({
      type: 'qber_response',
      sampleBits: bobSample,
    });

    setState(prev => ({ ...prev, sampleIndices }));
  };

  const handleQBERResponse = (bobSample: Bit[]) => {
    if (role !== 'alice') return;

    const aliceSample = state.sampleIndices.map(i => state.siftedKey[i]);
    const qber = calculateQBER(aliceSample, bobSample);

    setState(prev => ({ ...prev, qber }));

    const accepted = qber <= config.qberThreshold;

    connection.sendMessage({
      type: 'accept_or_abort',
      accepted,
      qber,
    });

    if (!accepted) {
      handleAbort(`QBER too high: ${(qber * 100).toFixed(2)}% > ${(config.qberThreshold * 100).toFixed(2)}%`);
    } else {
      toast({
        title: 'QBER Acceptable',
        description: `Error rate: ${(qber * 100).toFixed(2)}%`,
      });
      setState(prev => ({ ...prev, step: 'error-correction' }));
    }
  };

  const handleAcceptOrAbort = (accepted: boolean, qber: number) => {
    if (role !== 'bob') return;

    setState(prev => ({ ...prev, qber }));

    if (!accepted) {
      handleAbort(`QBER too high: ${(qber * 100).toFixed(2)}%`);
    } else {
      setState(prev => ({ ...prev, step: 'error-correction' }));
    }
  };

  // Error Correction
  const handleErrorCorrection = useCallback(() => {
    setLoading(true);

    setTimeout(() => {
      const myKey = state.siftedKey;
      const remainingKey = removeSampledBits(myKey, state.sampleIndices);

      // Simulate error correction (in real scenario, exchange parity bits)
      const ecStats = performErrorCorrection(remainingKey, remainingKey, state.qber || 0);

      setState(prev => ({
        ...prev,
        ecStats,
        siftedKey: ecStats.correctedKey,
        step: 'privacy-amplification',
      }));

      toast({
        title: 'Error Correction Complete',
        description: `Corrected ${ecStats.initialErrors} errors`,
      });

      setLoading(false);
    }, 1000);
  }, [state.siftedKey, state.sampleIndices, state.qber, toast]);

  // Privacy Amplification
  const handlePrivacyAmplification = useCallback(() => {
    setLoading(true);

    setTimeout(() => {
      const paStats = performPrivacyAmplification(
        state.siftedKey,
        state.qber || 0,
        state.ecStats?.bitsRevealed || 0
      );

      const finalKey = state.siftedKey.slice(0, paStats.outputLength);

      setState(prev => ({
        ...prev,
        paStats,
        finalKey,
      }));

      // Generate and exchange commitment
      const commitment = generateCommitment(finalKey);

      if (role === 'alice') {
        connection.sendMessage({
          type: 'final_key_commitment',
          commitment,
        });
      }

      toast({
        title: 'Privacy Amplification Complete',
        description: `Final key: ${paStats.outputLength} bits`,
      });

      setLoading(false);
    }, 1000);
  }, [role, state.siftedKey, state.qber, state.ecStats, connection, toast]);

  const handleKeyCommitment = (commitment: string) => {
    if (role !== 'bob') return;

    const match = verifyCommitment(state.finalKey, commitment);

    connection.sendMessage({
      type: 'final_key_confirmed',
      match,
    });

    if (match) {
      setState(prev => ({ ...prev, step: 'success' }));
      toast({
        title: 'Key Verified!',
        description: 'Keys match. Starting secure chat...',
      });
      setTimeout(() => {
        setState(prev => ({ ...prev, step: 'chat' }));
      }, 2000);
    } else {
      handleAbort('Key verification failed');
    }
  };

  const handleAbort = (reason: string) => {
    setState(prev => ({
      ...prev,
      step: 'aborted',
      abortReason: reason,
    }));

    toast({
      title: 'Protocol Aborted',
      description: reason,
      variant: 'destructive',
    });
  };

  const handleReset = () => {
    setState({
      step: 'idle',
      aliceBits: [],
      aliceBases: [],
      bobBases: [],
      bobOutcomes: [],
      keepMask: [],
      siftedKey: [],
      sampleIndices: [],
      qber: null,
      ecStats: null,
      paStats: null,
      finalKey: [],
      abortReason: null,
    });
    setPeerReady(false);
  };

  if (state.step === 'chat') {
    return <SecureChat role={role} connection={connection} finalKey={state.finalKey} onEnd={handleReset} />;
  }

  return (
    <div className="min-h-screen p-4 gradient-panel">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">BB84 Quantum Key Distribution</CardTitle>
                <CardDescription>
                  You are: <span className="font-bold capitalize">{role}</span>
                </CardDescription>
              </div>
              <Badge variant={state.step === 'success' ? 'default' : 'secondary'}>
                {state.step.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Quantum Backend</Label>
                <Select
                  value={config.backend}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, backend: value as any }))}
                  disabled={state.step !== 'idle'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qiskit">Qiskit</SelectItem>
                    <SelectItem value="pennylane">PennyLane</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Qubits</Label>
                <Select
                  value={config.numQubits.toString()}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, numQubits: parseInt(value) }))}
                  disabled={state.step !== 'idle'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sample Size</Label>
                <Select
                  value={config.sampleSize.toString()}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, sampleSize: parseInt(value) }))}
                  disabled={state.step !== 'idle'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="eve-mode"
                  checked={config.eveEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, eveEnabled: checked }))}
                  disabled={state.step !== 'idle'}
                />
                <Label htmlFor="eve-mode" className="cursor-pointer">Enable Eve (Eavesdropper)</Label>
              </div>
            </div>

            {config.eveEnabled && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Eve is intercepting and measuring qubits, which will increase the QBER and likely cause the protocol to abort.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Protocol Steps */}
        <div className={`grid grid-cols-1 ${config.eveEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {/* Alice's Panel */}
          <Card className={role === 'alice' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Alice (Sender)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handlePrepare}
                disabled={role !== 'alice' || state.step !== 'idle' || loading}
                className="w-full"
              >
                {loading && role === 'alice' && state.step === 'idle' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Prepare & Send Qubits</>
                )}
              </Button>

              {state.aliceBits.length > 0 && (
                <div className="space-y-2 text-sm">
                  <Label>Encoded Qubits (First 50):</Label>
                  <motion.div 
                    className="flex flex-wrap gap-1 bg-muted p-2 rounded"
                    variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
                    initial="hidden"
                    animate="visible"
                  >
                    {state.aliceBits.slice(0, 50).map((bit, i) => (
                      <Qubit key={i} bit={bit} basis={state.aliceBases[i]} />
                    ))}
                  </motion.div>
                </div>
              )}

              {state.siftedKey.length > 0 && role === 'alice' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Sifted Key Length:</Label>
                    <span className="font-bold text-lg text-primary">
                      <AnimatedCounter value={state.siftedKey.length} />
                    </span>
                  </div>
                  <Progress value={(state.siftedKey.length / (config.numQubits / 2)) * 100} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bob's Panel */}
          <Card className={role === 'bob' ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Bob (Receiver)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleMeasure}
                disabled={role !== 'bob' || !peerReady || state.step !== 'idle' || loading}
                className="w-full"
              >
                {loading && role === 'bob' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Measuring...</>
                ) : (
                  <><Radio className="mr-2 h-4 w-4" />Measure Qubits</>
                )}
              </Button>

              {state.bobBases.length > 0 && (
                <div className="space-y-2 text-sm">
                  <Label>Measurement Bases & Outcomes (First 50):</Label>
                  <motion.div 
                    className="flex flex-wrap gap-1 bg-muted p-2 rounded"
                    variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
                    initial="hidden"
                    animate="visible"
                  >
                    {state.bobOutcomes.slice(0, 50).map((bit, i) => (
                      <Qubit key={i} bit={bit} basis={state.bobBases[i]} />
                    ))}
                  </motion.div>
                </div>
              )}

              {state.siftedKey.length > 0 && role === 'bob' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Sifted Key Length:</Label>
                    <span className="font-bold text-lg text-primary">
                      <AnimatedCounter value={state.siftedKey.length} />
                    </span>
                  </div>
                  <Progress value={(state.siftedKey.length / (config.numQubits / 2)) * 100} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eve's Panel */}
          {config.eveEnabled && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Eve (Eavesdropper)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Eve is intercepting the qubits, measuring them with her own random bases, and resending them to Bob.
                </p>
                {state.eveBases && state.eveBases.length > 0 && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label>Eve's Bases:</Label>
                      <Label>Eve's Intercepted Qubits (First 50):</Label>
                      <motion.div 
                        className="flex flex-wrap gap-1 bg-muted p-2 rounded"
                        variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
                        initial="hidden"
                        animate="visible"
                      >
                        {state.eveOutcomes?.slice(0, 50).map((bit, i) => (
                          <Qubit key={i} bit={bit} basis={state.eveBases?.[i] ?? 0} isMismatched={state.aliceBases[i] !== state.eveBases?.[i]} />
                        ))}
                      </motion.div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      <span className="text-destructive font-bold">Red</span> bases indicate where Eve guessed incorrectly, potentially causing an error for Bob.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Protocol Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Protocol Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={handleSifting}
                disabled={state.step !== 'sifting' || loading}
                variant={state.step === 'sifting' ? 'default' : 'outline'}
              >
                Sifting
              </Button>

              <Button
                onClick={handleQBEREstimation}
                disabled={state.step !== 'qber' || role !== 'alice' || loading}
                variant={state.step === 'qber' ? 'default' : 'outline'}
              >
                QBER Check
              </Button>

              <Button
                onClick={handleErrorCorrection}
                disabled={state.step !== 'error-correction' || loading}
                variant={state.step === 'error-correction' ? 'default' : 'outline'}
              >
                Error Correction
              </Button>

              <Button
                onClick={handlePrivacyAmplification}
                disabled={state.step !== 'privacy-amplification' || loading}
                variant={state.step === 'privacy-amplification' ? 'default' : 'outline'}
              >
                Privacy Amplification
              </Button>
            </div>

            {/* Sifting Visualization */}
            {state.keepMask.length > 0 && (
              <SiftedQubitDisplay
                aliceBits={state.aliceBits}
                aliceBases={state.aliceBases}
                bobBases={state.bobBases}
                keepMask={state.keepMask}
              />
            )}

            {/* Results */}
            {state.qber !== null && (
              <Alert variant={state.qber > config.qberThreshold ? 'destructive' : 'default'}>
                <AlertDescription>
                  QBER: <AnimatedCounter value={state.qber * 100} precision={2} />% (Threshold: {(config.qberThreshold * 100).toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}

            {state.ecStats && (
              <Alert>
                <AlertDescription>
                  Error Correction: {state.ecStats.initialErrors} errors corrected in {state.ecStats.parityRounds} rounds
                </AlertDescription>
              </Alert>
            )}

            {state.paStats && (
              <Alert>
                <AlertDescription>
                  Privacy Amplification: <AnimatedCounter value={state.paStats.inputLength} /> bits → <AnimatedCounter value={state.paStats.outputLength} /> bits
                </AlertDescription>
              </Alert>
            )}

            {state.finalKey.length > 0 && (
              <div className="space-y-2">
                <Label>Final Key (<AnimatedCounter value={state.finalKey.length} /> bits):</Label>
                <div className="font-mono text-xs bg-muted p-3 rounded break-all">
                  {bitsToHex(state.finalKey)}
                </div>
              </div>
            )}

            {state.step === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Key exchange successful! Starting secure chat...
                </AlertDescription>
              </Alert>
            )}

            {state.step === 'aborted' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Protocol aborted: {state.abortReason}
                </AlertDescription>
              </Alert>
            )}

            {(state.step === 'aborted' || state.step === 'success') && (
              <Button onClick={handleReset} className="w-full">
                Start New Session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BB84Protocol;
