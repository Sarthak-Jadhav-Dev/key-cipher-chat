import { useState, useEffect } from 'react';
import { Role } from '@/types/quantum';
import RoomSetup from '@/components/RoomSetup';
import RoleSelection from '@/components/RoleSelection';
import ConnectionSetup from '@/components/ConnectionSetup';
import { WebRTCConnection } from '@/utils/webrtc';
import { useToast } from '@/hooks/use-toast';

type AppState = 'setup' | 'role-selection' | 'connection-setup' | 'protocol';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('setup');
  const [roomId, setRoomId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [myRole, setMyRole] = useState<Role>(null);
  const [peerRole, setPeerRole] = useState<Role>(null);
  const [connection, setConnection] = useState<WebRTCConnection | null>(null);
  const [connectionOffer, setConnectionOffer] = useState('');
  const [isDataChannelReady, setIsDataChannelReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.close();
      }
    };
  }, [connection]);

  const handleRoomCreated = async (id: string, pass: string, creator: boolean) => {
    setRoomId(id);
    setPasscode(pass);
    setIsCreator(creator);
    
    // Create WebRTC connection
    const rtcConn = new WebRTCConnection();
    setConnection(rtcConn);

    // Set up message handler early
    rtcConn.onMessage((data) => {
      if (data.type === 'role_selected') {
        setPeerRole(data.role);
      }
    });

    rtcConn.onConnectionStateChange((state) => {
      console.log('Connection state:', state);
      if (state === 'connected') {
        toast({
          title: "Connected",
          description: "Peer-to-peer connection established",
        });
      }
    });

    if (creator) {
      // Creator creates data channel and offer
      rtcConn.createDataChannel('bb84-channel');
      rtcConn.onDataChannelOpen(() => {
        console.log('Data channel opened');
        setIsDataChannelReady(true);
      });
      const offer = await rtcConn.createOffer();
      setConnectionOffer(offer);
      setAppState('connection-setup');
    } else {
      // Joiner waits for offer
      rtcConn.onDataChannel(() => {
        console.log('Data channel received');
        setIsDataChannelReady(true);
      });
      setAppState('connection-setup');
    }
  };

  const handleConnectionEstablished = async (offer?: string, answer?: string) => {
    if (!connection) return;

    try {
      if (isCreator && answer) {
        // Creator receives answer
        await connection.handleAnswer(answer);
        setAppState('role-selection');
      } else if (!isCreator && offer) {
        // Joiner receives offer and generates answer
        const generatedAnswer = await connection.handleOffer(offer);
        setConnectionOffer(generatedAnswer);
        // Show the answer to user to send back
        // For now, auto-proceed (in real app, wait for confirmation)
        setTimeout(() => {
          setAppState('role-selection');
        }, 2000);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRoleSelected = (role: Role) => {
    setMyRole(role);
    
    // Send role selection to peer
    if (connection && isDataChannelReady) {
      connection.sendMessage({
        type: 'role_selected',
        role: role
      });
    } else {
      console.warn('Data channel not ready, cannot send role');
      toast({
        title: "Connection Not Ready",
        description: "Please wait for the connection to establish",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check if both roles are selected
    if (myRole && peerRole) {
      // Validate roles
      if (myRole === peerRole) {
        toast({
          title: "Role Conflict",
          description: "Both users cannot have the same role. Please select different roles.",
          variant: "destructive",
        });
        setMyRole(null);
        setPeerRole(null);
      } else {
        // Both roles selected, proceed to protocol
        setAppState('protocol');
      }
    }
  }, [myRole, peerRole, toast]);

  const renderState = () => {
    switch (appState) {
      case 'setup':
        return <RoomSetup onRoomCreated={handleRoomCreated} />;
      
      case 'connection-setup':
        return (
          <ConnectionSetup 
            isCreator={isCreator}
            onConnectionEstablished={handleConnectionEstablished}
            offer={connectionOffer}
          />
        );
      
      case 'role-selection':
        return (
          <RoleSelection 
            onRoleSelected={handleRoleSelected}
            aliceTaken={myRole === 'alice' || peerRole === 'alice'}
            bobTaken={myRole === 'bob' || peerRole === 'bob'}
            isReady={isDataChannelReady}
          />
        );
      
      case 'protocol':
        return (
          <div className="min-h-screen flex items-center justify-center p-4 gradient-panel">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">BB84 Protocol</h1>
              <p className="text-xl text-muted-foreground mb-4">
                You are: <span className="font-bold capitalize">{myRole}</span>
              </p>
              <p className="text-muted-foreground">
                Protocol interface coming soon...
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return renderState();
};

export default Index;
