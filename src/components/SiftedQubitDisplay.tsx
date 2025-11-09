import { motion, AnimatePresence } from 'framer-motion';
import { Bit, Basis } from '@/types/bb84';
import Qubit from './Qubit';
import { Label } from './ui/label';

interface SiftedQubitDisplayProps {
  aliceBits: Bit[];
  aliceBases: Basis[];
  bobBases: Basis[];
  keepMask: boolean[];
}

const SiftedQubitDisplay = ({ aliceBits, aliceBases, bobBases, keepMask }: SiftedQubitDisplayProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  return (
    <div className="space-y-3">
      <Label>Sifting Result (First 50 Qubits)</Label>
      <p className="text-xs text-muted-foreground">
        Qubits where bases mismatched are faded out. The remaining qubits form the sifted key.
      </p>
      <motion.div
        className="flex flex-wrap gap-2 bg-muted p-3 rounded-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {aliceBits.slice(0, 50).map((bit, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <Qubit
                bit={bit}
                basis={aliceBases[i]}
                isFaded={!keepMask[i]}
              />
              <div 
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold ${aliceBases[i] === bobBases[i] ? 'text-green-500' : 'text-destructive'}`}
              >
                {bobBases[i] === 0 ? '+' : '×'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Bob's Bases:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Match</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Mismatch</span>
        </div>
      </div>
    </div>
  );
};

export default SiftedQubitDisplay;
