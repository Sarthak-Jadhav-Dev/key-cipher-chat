import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Lock, Clock, Home } from 'lucide-react';
import { Role } from '@/types/quantum';
import { Bit, BB84Message } from '@/types/bb84';
import { KeyCipher } from '@/utils/encryption';
import { WebRTCConnection } from '@/utils/webrtc';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface SecureChatProps {
  role: Role;
  connection: WebRTCConnection;
  finalKey: Bit[];
  onEnd: () => void;
}

interface ChatMessage {
  sender: Role;
  text: string;
  timestamp: Date;
}

const CHAT_DURATION = 120; // 2 minutes in seconds

const SecureChat = ({ role, connection, finalKey, onEnd }: SecureChatProps) => {
  const { toast } = useToast();
  const [cipher] = useState(() => new KeyCipher(finalKey));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(CHAT_DURATION);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndChat();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (data: BB84Message) => {
      if (data.type === 'chat_message') {
        try {
          const decrypted = cipher.decrypt(data.encrypted, data.iv);
          const peerRole: Role = role === 'alice' ? 'bob' : 'alice';
          
          setMessages(prev => [...prev, {
            sender: peerRole,
            text: decrypted,
            timestamp: new Date(),
          }]);
        } catch (error) {
          console.error('Decryption failed:', error);
          toast({
            title: 'Decryption Error',
            description: 'Failed to decrypt message',
            variant: 'destructive',
          });
        }
      } else if (data.type === 'chat_ended') {
        handleEndChat();
      }
    };

    connection.onMessage(handleMessage);
  }, [cipher, role, connection, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    try {
      // Encrypt message
      const { encrypted, iv } = cipher.encrypt(inputText);

      // Send encrypted message
      connection.sendMessage({
        type: 'chat_message',
        encrypted,
        iv,
      });

      // Add to local messages
      setMessages(prev => [...prev, {
        sender: role,
        text: inputText,
        timestamp: new Date(),
      }]);

      setInputText('');
    } catch (error) {
      console.error('Encryption failed:', error);
      toast({
        title: 'Encryption Error',
        description: 'Failed to encrypt message',
        variant: 'destructive',
      });
    }
  };

  const handleEndChat = () => {
    connection.sendMessage({ type: 'chat_ended' });
    
    toast({
      title: 'Chat Ended',
      description: 'Secure session completed',
    });

    setTimeout(() => {
      onEnd();
    }, 2000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-panel">
      <Card className="w-full max-w-3xl shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Quantum-Secured Chat
              </CardTitle>
              <CardDescription>
                End-to-end encrypted with BB84-derived key
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={timeRemaining > 30 ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(timeRemaining)}
              </Badge>
              <Badge variant="outline">
                {role === 'alice' ? 'Alice' : 'Bob'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat Messages */}
          <ScrollArea className="h-96 w-full rounded-md border p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Secure channel established</p>
                  <p className="text-sm">Start chatting with quantum-secured encryption</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === role ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender === role
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold capitalize">
                          {msg.sender}
                        </span>
                        <span className="text-xs opacity-70">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              disabled={timeRemaining === 0}
              maxLength={200}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || timeRemaining === 0}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>Messages encrypted with {finalKey.length}-bit quantum key</span>
            </div>
            <span>{inputText.length}/200</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleEndChat} variant="outline" className="flex-1">
              Return to Protocol
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>

          {timeRemaining === 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Session expired</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureChat;
