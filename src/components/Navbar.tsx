import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Quantum Cipher Chat</span>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
