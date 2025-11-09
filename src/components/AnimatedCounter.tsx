import { useEffect } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  precision?: number;
  className?: string;
}

const AnimatedCounter = ({ value, precision = 0, className }: AnimatedCounterProps) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 100,
    stiffness: 100,
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      const element = document.getElementById(`counter-${value}`);
      if (element) {
        element.textContent = latest.toFixed(precision);
      }
    });
    return unsubscribe;
  }, [springValue, value, precision]);

  return <span id={`counter-${value}`} className={className}>{value.toFixed(precision)}</span>;
};

export default AnimatedCounter;
