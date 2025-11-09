import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Link } from 'react-router-dom';

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
  const configRef = useRef(config);

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
  const stateRef = useRef(state);
  const toastRef = useRef(toast);

  const [simulator] = useState(() => new QuantumSimulator(config.backend));
  const [loading, setLoading] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [hasSentBases, setHasSentBases] = useState(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (data: BB84Message) => {
      const currentState = stateRef.current;
      const currentConfig = configRef.current;
      console.log('Received BB84 message:', data.type);

      switch (data.type) {
        case 'prepared':
          if (role === 'bob') {
            setState(prev => ({
              ...prev,
              aliceBits: data.aliceBits, // Store for measurement comparison
              aliceBases: data.aliceBases, // Store for measurement comparison
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
          // Received bases from peer, now perform sifting
          setHasSentBases(prev => {
            // If we haven't sent our bases yet, send them now.
            if (!prev) {
              const myBases = role === 'alice' ? currentState.aliceBases : currentState.bobBases;
              connection.sendMessage({ type: 'announce_bases', bases: myBases });
            }
            return true;
          });
          
          // Perform sifting
          const myBases = role === 'alice' ? currentState.aliceBases : currentState.bobBases;
          const keepMask = performSifting(myBases, data.bases);
          const myBits = role === 'alice' ? currentState.aliceBits : currentState.bobOutcomes;
          const siftedKey = extractSiftedKey(myBits, keepMask);
          setState(prev => ({ 
            ...prev, 
            bobBases: role === 'alice' ? data.bases : prev.bobBases, 
            keepMask, 
            siftedKey, 
            step: 'qber' 
          }));
          if (role === 'bob') {
            connection.sendMessage({ type: 'sifting_result', keepMask });
          }
          toast({ title: 'Sifting Complete', description: `Kept ${siftedKey.length} bits` });
          break;

        case 'sifting_result':
          if (role === 'alice') {
            const siftedKey = extractSiftedKey(currentState.aliceBits, data.keepMask);
            setState(prev => ({ ...prev, step: 'qber', siftedKey, keepMask: data.keepMask }));
            toast({ title: 'Sifting Complete', description: 'Ready for QBER check.' });
          }
          break;

        case 'qber_request':
          if (role === 'bob') {
            const bobSiftedKey = extractSiftedKey(currentState.bobOutcomes, currentState.keepMask);
            console.log('Bob QBER - Sifted key length:', bobSiftedKey.length);
            console.log('Bob QBER - Sample indices:', data.sampleIndices);
            
            const bobSample = data.sampleIndices
              .map(i => bobSiftedKey[i])
              .filter((bit): bit is Bit => bit !== undefined);

            console.log('Bob QBER - Alice sample:', data.sampleBits);
            console.log('Bob QBER - Bob sample:', bobSample);

            if (bobSample.length !== data.sampleIndices.length) {
              handleAbort('Insufficient sifted bits for QBER estimation.');
              break;
            }

            connection.sendMessage({ type: 'qber_response', sampleBits: bobSample });

            const qber = calculateQBER(data.sampleBits, bobSample);
            console.log('Bob QBER calculated:', qber);

            if (qber > currentConfig.qberThreshold) {
              handleAbort(`QBER of ${(qber * 100).toFixed(2)}% exceeds threshold.`);
            } else {
              const keyAfterSampleRemoval = removeSampledBits(bobSiftedKey, data.sampleIndices);
              setState(prev => ({ ...prev, step: 'error-correction', qber, siftedKey: keyAfterSampleRemoval }));
              toast({ title: 'QBER Acceptable', description: `QBER: ${(qber * 100).toFixed(2)}%` });
            }
          }
          break;

        case 'qber_response':
          if (role === 'alice') {
            const aliceSiftedKey = extractSiftedKey(currentState.aliceBits, currentState.keepMask);
            console.log('Alice QBER - Sifted key length:', aliceSiftedKey.length);
            console.log('Alice QBER - Sample indices:', currentState.sampleIndices);
            
            const aliceSample = currentState.sampleIndices
              .map(i => aliceSiftedKey[i])
              .filter((bit): bit is Bit => bit !== undefined);

            console.log('Alice QBER - Alice sample:', aliceSample);
            console.log('Alice QBER - Bob sample:', data.sampleBits);

            if (aliceSample.length !== currentState.sampleIndices.length) {
              handleAbort('Insufficient sifted bits for QBER evaluation.');
              break;
            }

            const qber = calculateQBER(aliceSample, data.sampleBits);
            console.log('Alice QBER calculated:', qber);

            if (qber > currentConfig.qberThreshold) {
              handleAbort(`QBER of ${(qber * 100).toFixed(2)}% exceeds threshold.`);
            } else {
              const keyAfterSampleRemoval = removeSampledBits(aliceSiftedKey, currentState.sampleIndices);
              setState(prev => ({ ...prev, step: 'error-correction', qber, siftedKey: keyAfterSampleRemoval }));
              toast({ title: 'QBER Acceptable', description: `QBER: ${(qber * 100).toFixed(2)}%` });
            }
          }
          break;


        case 'error_correction_stats':
          if (role === 'bob') {
            // Bob needs to use the corrected key from Alice's error correction
            setState(prev => ({ 
              ...prev, 
              ecStats: data.stats, 
              siftedKey: data.stats.correctedKey, // Use Alice's corrected key
              step: 'privacy-amplification' 
            }));
            toast({ title: 'Error Correction Complete', description: 'Ready for privacy amplification.' });
          }
          break;

        case 'privacy_amplification':
          // Handle privacy amplification
          break;

        case 'final_key_commitment':
          if (role === 'bob') {
            // Bob needs to compute his own finalKey from his sifted key
            const paStats = performPrivacyAmplification(currentState.siftedKey, currentState.qber ?? 0, currentState.ecStats?.bitsRevealed ?? 0);
            const finalKey = currentState.siftedKey.slice(0, paStats.outputLength);
            
            const match = verifyCommitment(finalKey, data.commitment);

            connection.sendMessage({
              type: 'final_key_confirmed',
              match,
            });

            if (match) {
              setState(prev => ({ ...prev, paStats, finalKey, step: 'success' }));
              toast({
                title: 'Key Verified!',
                description: 'Keys match. You can now proceed to secure chat.',
              });
            } else {
              setState(prev => ({
                ...prev,
                step: 'aborted',
                abortReason: 'Key verification failed',
              }));
              toast({
                title: 'Protocol Aborted',
                description: 'Key verification failed',
                variant: 'destructive',
              });
            }
          }
          break;

        case 'final_key_confirmed':
          if (data.match) {
            setState(prev => ({ ...prev, step: 'success' }));
            toast({
              title: 'Key Exchange Successful!',
              description: 'Secure key established. Choose how to proceed.',
            });
          } else {
            handleAbort('Key commitment mismatch');
          }
          break;
      }
    };

    connection.onMessage(handleMessage);
  }, [role, connection]);

  const handlePrepare = useCallback(() => {
    if (role !== 'alice' || state.step !== 'idle') return;
    setLoading(true);
    setTimeout(() => {
      const aliceBits = simulator.generateRandomBits(config.numQubits);
      const aliceBases = simulator.generateRandomBases(config.numQubits);
      setState(prev => ({ ...prev, step: 'preparation', aliceBits, aliceBases, bobBases: [], bobOutcomes: [] }));
      connection.sendMessage({ type: 'prepared', numQubits: config.numQubits, aliceBits, aliceBases });
      setLoading(false);
      toast({ title: 'Qubits Prepared', description: `${config.numQubits} qubits encoded and sent` });
    }, 1000);
  }, [role, config.numQubits, simulator, connection, state.step]);

  const handleMeasure = useCallback(() => {
    if (role !== 'bob' || !peerReady || state.step !== 'idle') return;
    setLoading(true);
    setTimeout(() => {
      const bobBases = simulator.generateRandomBases(config.numQubits);
      const transmissionResult = simulator.simulateTransmission(state.aliceBits, state.aliceBases, bobBases, config.eveEnabled);
      const eveBases = transmissionResult.eveBases;
      const eveOutcomes = transmissionResult.eveOutcomes;
      const bobOutcomes = transmissionResult.bobOutcomes;
      setState(prev => ({ ...prev, step: 'measurement', bobBases, bobOutcomes, eveBases, eveOutcomes }));
      connection.sendMessage({ type: 'measured', numQubits: config.numQubits });
      setLoading(false);
      toast({ title: 'Qubits Measured', description: `${config.numQubits} qubits measured` });
    }, 1000);
  }, [role, peerReady, config, simulator, connection, state.aliceBits, state.aliceBases, state.step]);

  const handleSifting = useCallback(() => {
    if (state.step !== 'sifting' || hasSentBases) return;
    setLoading(true);
    setTimeout(() => {
      const bases = role === 'alice' ? state.aliceBases : state.bobBases;
      connection.sendMessage({ type: 'announce_bases', bases });
      setHasSentBases(true);
      setLoading(false);
    }, 500);
  }, [role, state.step, state.aliceBases, state.bobBases, connection, hasSentBases]);

  const handleQBEREstimation = useCallback(() => {
    const currentState = stateRef.current;
    if (role !== 'alice' || currentState.step !== 'qber') return;
    if (currentState.siftedKey.length === 0) {
      toastRef.current({ 
        title: 'Error', 
        description: 'No sifted key available for QBER estimation',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    const sampleIndices = selectRandomSample(currentState.siftedKey.length, config.sampleSize);
    const sampleBits = sampleIndices.map(i => currentState.siftedKey[i]);
    setState(prev => ({ ...prev, sampleIndices }));
    connection.sendMessage({ type: 'qber_request', sampleIndices, sampleBits });
    toastRef.current({ title: 'QBER sample sent' });
    setLoading(false);
  }, [role, config.sampleSize, connection]);

  const handleErrorCorrection = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.step !== 'error-correction') return;
    setLoading(true);
    if (role === 'alice') {
      const bobSiftedKey = extractSiftedKey(currentState.bobOutcomes, currentState.keepMask);
      const keyForEC = removeSampledBits(bobSiftedKey, currentState.sampleIndices);
      const ecStats = performErrorCorrection(currentState.siftedKey, keyForEC, currentState.qber ?? 0);
      setState(prev => ({ ...prev, ecStats, siftedKey: ecStats.correctedKey, step: 'privacy-amplification' }));
      connection.sendMessage({ type: 'error_correction_stats', stats: ecStats });
      toastRef.current({ title: 'Error Correction Complete' });
    }
    setLoading(false);
  }, [role, connection]);

  const handlePrivacyAmplification = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.step !== 'privacy-amplification') return;
    setLoading(true);
    const paStats = performPrivacyAmplification(currentState.siftedKey, currentState.qber ?? 0, currentState.ecStats?.bitsRevealed ?? 0);
    const finalKey = currentState.siftedKey.slice(0, paStats.outputLength);
    const commitment = generateCommitment(finalKey);
    setState(prev => ({ ...prev, paStats, finalKey, step: 'success' }));
    connection.sendMessage({ type: 'final_key_commitment', commitment });
    toastRef.current({ title: 'Privacy Amplification Complete' });
    setLoading(false);
  }, [connection]);

  const handleEnterChat = useCallback(() => {
    setState(prev => ({ ...prev, step: 'chat' }));
  }, []);

  const handleAbort = useCallback((reason: string) => {
    setState(prev => ({
      ...prev,
      step: 'aborted',
      abortReason: reason,
    }));

    toastRef.current({
      title: 'Protocol Aborted',
      description: reason,
      variant: 'destructive',
    });
  }, []);

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
    setHasSentBases(false);
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
                    {state.bobOutcomes.slice(0, 50).map((bit, i) => {
                      const isMatch = state.aliceBases[i] === state.bobBases[i];
                      return (
                        <Qubit
                          key={i}
                          bit={bit}
                          basis={state.bobBases[i]}
                          isMismatched={!isMatch} // Highlight if bases DON'T match
                        />
                      );
                    })}
                  </motion.div>
                  <p className="text-xs text-muted-foreground pt-2">
                    <span className="text-destructive font-bold">Red</span> qubits indicate where Bob's basis choice was incorrect. These will be discarded during sifting.
                  </p>
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
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Key exchange successful! Choose how you'd like to continue.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full sm:flex-1" onClick={handleEnterChat}>
                    Enter Secure Chat
                  </Button>
                  <Button className="w-full sm:flex-1" variant="outline" asChild>
                    <Link to="/">
                      Return Home
                    </Link>
                  </Button>
                  <Button className="w-full sm:flex-1" variant="secondary" onClick={handleReset}>
                    Start New Session
                  </Button>
                </div>
              </div>
            )}

            {state.step === 'aborted' && (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Protocol aborted: {state.abortReason}
                  </AlertDescription>
                </Alert>
                <Button onClick={handleReset} className="w-full">
                  Start New Session
                </Button>
              </>
            )}

            {state.step === 'idle' && (
              <Button onClick={handleReset} className="w-full" variant="outline" asChild>
                <Link to="/">
                  Return Home
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BB84Protocol;
