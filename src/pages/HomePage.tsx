import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Zap, KeyRound, MessageCircle, Users } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const HomePage = () => {
  const featureVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: [0.42, 0, 0.58, 1], // Custom cubic-bezier for easeOut
      },
    }),
  };

  const features = [
    {
      icon: <KeyRound className="h-8 w-8 text-primary" />,
      title: 'Quantum Key Distribution',
      description: 'Generate a theoretically unbreakable key using the BB84 protocol.',
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: 'Eavesdropper Detection',
      description: 'Instantly detect any intruder trying to intercept the key, guaranteed by the laws of physics.',
    },
    {
      icon: <MessageCircle className="h-8 w-8 text-primary" />,
      title: 'End-to-End Encrypted Chat',
      description: 'Communicate in total privacy using the quantum-generated key for encryption.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Peer-to-Peer Connection',
      description: 'Connect directly to your peer with a secure, authenticated WebRTC channel.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="container mx-auto px-4 py-20 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-block mb-4"
        >
          <Zap className="h-16 w-16 text-primary" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary-foreground"
        >
          Quantum Cipher Chat
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground"
        >
          Experience the future of secure communication. A web-based simulation of the BB84 protocol for generating and using a quantum-secure key.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 flex justify-center gap-4"
        >
          <Button asChild size="lg">
            <Link to="/room">Create Secure Room</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/room">Join a Room</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-6 bg-card rounded-lg border text-center"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={featureVariants}
            >
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t">
        <p className="text-muted-foreground">A demonstration of Quantum Key Distribution. Not for production use.</p>
      </footer>
    </div>
  );
};

export default HomePage;
