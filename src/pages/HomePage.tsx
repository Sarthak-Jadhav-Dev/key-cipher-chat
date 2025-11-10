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
      <section id="features" className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge quantum cryptography technology at your fingertips
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-6 bg-card rounded-lg border text-center hover:shadow-lg transition-shadow"
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

      {/* About Section */}
      <section id="about" className="container mx-auto px-4 py-16 bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">About BB84 Protocol</h2>
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              The BB84 protocol, developed by Charles Bennett and Gilles Brassard in 1984, is the first and most widely known quantum key distribution (QKD) scheme. It enables two parties to establish a shared secret key with unconditional security guaranteed by the laws of quantum mechanics.
            </p>
            <p className="text-lg leading-relaxed">
              This application demonstrates the BB84 protocol in an interactive, web-based environment. While this is a simulation and not using actual quantum hardware, it accurately models the protocol's steps: quantum state preparation, transmission, measurement, basis reconciliation, error estimation, error correction, and privacy amplification.
            </p>
            <p className="text-lg leading-relaxed">
              Any attempt to eavesdrop on the quantum channel will introduce detectable errors due to the no-cloning theorem and the observer effect in quantum mechanics. This makes quantum key distribution fundamentally more secure than classical key exchange methods.
            </p>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">1. Preparation</div>
              <p className="text-muted-foreground">Alice prepares qubits in random states using random bases (rectilinear or diagonal).</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">2. Transmission</div>
              <p className="text-muted-foreground">Alice sends the quantum states to Bob through a quantum channel.</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">3. Measurement</div>
              <p className="text-muted-foreground">Bob measures each qubit using randomly chosen bases.</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">4. Sifting</div>
              <p className="text-muted-foreground">Alice and Bob compare bases publicly and keep only matching measurements.</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">5. Error Check</div>
              <p className="text-muted-foreground">They estimate the quantum bit error rate (QBER) to detect eavesdropping.</p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary mb-2">6. Privacy Amplification</div>
              <p className="text-muted-foreground">The final key is compressed to ensure maximum security.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t">
        <p className="text-muted-foreground">A demonstration of Quantum Key Distribution. Not for production use.</p>
      </footer>
    </div>
  );
};

export default HomePage;
