import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoomSetupProps {
  onRoomCreated: (roomId: string, passcode: string, isCreator: boolean) => void;
}

const RoomSetup = ({ onRoomCreated }: RoomSetupProps) => {
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const generatePasscode = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    const newPasscode = generatePasscode();
    setRoomId(newRoomId);
    setPasscode(newPasscode);
    
    toast({
      title: "Room Created",
      description: "Share the Room ID and Passcode with your peer",
    });
  };

  const handleStartSession = () => {
    if (roomId && passcode) {
      onRoomCreated(roomId, passcode, true);
    }
  };

  const handleJoinRoom = () => {
    if (roomId && passcode) {
      onRoomCreated(roomId, passcode, false);
      toast({
        title: "Joining Room",
        description: `Connecting to room ${roomId}...`,
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-panel">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-quantum flex items-center justify-center quantum-glow">
            <span className="text-3xl">🔐</span>
          </div>
          <CardTitle className="text-2xl font-bold">BB84 Quantum Key Distribution</CardTitle>
          <CardDescription>
            Secure peer-to-peer quantum key exchange simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Room</TabsTrigger>
              <TabsTrigger value="join">Join Room</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 mt-4">
              {!roomId ? (
                <Button 
                  onClick={handleCreateRoom} 
                  className="w-full"
                  size="lg"
                >
                  Generate Room Credentials
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Room ID</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={roomId} 
                        readOnly 
                        className="font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(roomId, 'Room ID')}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Passcode</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={passcode} 
                        readOnly 
                        className="font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(passcode, 'Passcode')}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Share these credentials with your peer to establish a secure quantum channel.
                    </p>
                  </div>

                  <Button 
                    onClick={handleStartSession} 
                    className="w-full"
                    size="lg"
                  >
                    Start Session
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="join-room-id">Room ID</Label>
                <Input 
                  id="join-room-id"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="join-passcode">Passcode</Label>
                <Input 
                  id="join-passcode"
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleJoinRoom} 
                className="w-full"
                size="lg"
                disabled={!roomId || !passcode}
              >
                Join Room
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomSetup;
