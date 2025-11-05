import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Role } from '@/types/quantum';
import { User, Users } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelected: (role: Role) => void;
  aliceTaken: boolean;
  bobTaken: boolean;
}

const RoleSelection = ({ onRoleSelected, aliceTaken, bobTaken }: RoleSelectionProps) => {
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    if (role) {
      onRoleSelected(role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-panel">
      <Card className="w-full max-w-2xl shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-quantum flex items-center justify-center quantum-glow">
            <Users className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Select Your Role</CardTitle>
          <CardDescription>
            Choose your role in the BB84 protocol. Each room needs exactly one Alice (sender) and one Bob (receiver).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${
                aliceTaken 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-lg hover:scale-105'
              }`}
              onClick={() => !aliceTaken && handleSelectRole('alice')}
            >
              <CardHeader>
                <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-quantum-alice/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-quantum-alice" />
                </div>
                <CardTitle className="text-center">Alice (Sender)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Prepares quantum states</li>
                  <li>• Encodes random bits in random bases</li>
                  <li>• Sends photons to Bob</li>
                  <li>• Initiates the protocol</li>
                </ul>
                {aliceTaken && (
                  <div className="mt-4 p-2 bg-destructive/10 text-destructive text-sm rounded text-center">
                    Role already taken
                  </div>
                )}
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                bobTaken 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-lg hover:scale-105'
              }`}
              onClick={() => !bobTaken && handleSelectRole('bob')}
            >
              <CardHeader>
                <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-quantum-bob/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-quantum-bob" />
                </div>
                <CardTitle className="text-center">Bob (Receiver)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Receives quantum states</li>
                  <li>• Measures in random bases</li>
                  <li>• Records measurement outcomes</li>
                  <li>• Responds to Alice</li>
                </ul>
                {bobTaken && (
                  <div className="mt-4 p-2 bg-destructive/10 text-destructive text-sm rounded text-center">
                    Role already taken
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Waiting for both roles to be selected before starting the protocol...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
