import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  const handleNavClick = (sectionId: string) => {
    if (isHomePage) {
      // Already on homepage, just scroll
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to homepage first, then scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Quantum Cipher Chat</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Button
            variant="ghost"
            onClick={() => handleNavClick('features')}
            className="text-sm font-medium"
          >
            Features
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleNavClick('about')}
            className="text-sm font-medium"
          >
            About
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleNavClick('how-it-works')}
            className="text-sm font-medium"
          >
            How It Works
          </Button>
          {!isHomePage && (
            <Button asChild variant="default" size="sm">
              <Link to="/">Home</Link>
            </Button>
          )}
          {isHomePage && (
            <Button asChild variant="default" size="sm">
              <Link to="/room">Get Started</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
