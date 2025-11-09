import { motion } from 'framer-motion';
import { Bit, Basis } from '@/types/bb84';

interface QubitProps {
  bit: Bit;
  basis: Basis;
  isMismatched?: boolean;
  isFaded?: boolean;
}

const Qubit = ({ bit, basis, isMismatched = false, isFaded = false }: QubitProps) => {
  const variants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
    faded: { opacity: 0.2, scale: 0.8 },
  };

  const getPolarization = () => {
    if (basis === 0) { // Rectilinear
      return bit === 0 ? 'rotate(0)' : 'rotate(90)';
    } else { // Diagonal
      return bit === 0 ? 'rotate(45)' : 'rotate(-45)';
    }
  };

  const color = isMismatched ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate={isFaded ? 'faded' : 'visible'}
      transition={{ duration: 0.3 }}
      className="relative w-8 h-8 flex items-center justify-center"
      title={`Basis: ${basis === 0 ? '+' : 'x'}, Bit: ${bit}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-opacity"
      >
        {/* Basis representation */}
        <circle cx="12" cy="12" r="10" fill="transparent" stroke={'hsl(var(--muted-foreground))'} opacity="0.3" />
        {basis === 0 ? (
          <>
            <line x1="12" y1="4" x2="12" y2="20" stroke="hsl(var(--muted-foreground))" opacity="0.2" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="hsl(var(--muted-foreground))" opacity="0.2" />
          </>
        ) : (
          <>
            <line x1="6" y1="6" x2="18" y2="18" stroke="hsl(var(--muted-foreground))" opacity="0.2" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="hsl(var(--muted-foreground))" opacity="0.2" />
          </>
        )}
        
        {/* Polarization arrow */}
        <g transform={getPolarization()} style={{ transformOrigin: 'center' }}>
          <line x1="12" y1="2" x2="12" y2="22" stroke={color} />
          <polyline points="8,6 12,2 16,6" stroke={color} fill="none" />
        </g>
      </svg>
    </motion.div>
  );
};

export default Qubit;
