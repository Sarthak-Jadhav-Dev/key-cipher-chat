import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConnectionSetupProps {
  isCreator: boolean;
  onConnectionEstablished: (offer?: string, answer?: string) => void;
  offer?: string;
}

const ConnectionSetup = ({ isCreator, onConnectionEstablished, offer }: ConnectionSetupProps) => {
  const [offerSdp, setOfferSdp] = useState(offer || '');
  const [answerSdp, setAnswerSdp] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Connection data copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = () => {
    setLoading(true);
    setTimeout(() => {
      if (isCreator) {
        onConnectionEstablished(undefined, answerSdp);
      } else {
        onConnectionEstablished(offerSdp);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-panel">
      <Card className="w-full max-w-2xl shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isCreator ? 'Share Connection Offer' : 'Enter Connection Offer'}
          </CardTitle>
          <CardDescription>
            {isCreator 
              ? 'Copy the offer below and send it to your peer through a secure channel'
              : 'Paste the offer you received from your peer'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreator ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Connection Offer (Share this)</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(offerSdp)}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea 
                  value={offerSdp}
                  readOnly
                  className="font-mono text-xs h-32"
                  placeholder="Generating offer..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Connection Answer (Paste from peer)</Label>
                <Textarea 
                  id="answer"
                  value={answerSdp}
                  onChange={(e) => setAnswerSdp(e.target.value)}
                  className="font-mono text-xs h-32"
                  placeholder="Paste the answer from your peer here..."
                />
              </div>

              <Button 
                onClick={handleConnect}
                className="w-full"
                size="lg"
                disabled={!answerSdp || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Complete Connection'
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="offer">Connection Offer (Paste here)</Label>
                <Textarea 
                  id="offer"
                  value={offerSdp}
                  onChange={(e) => setOfferSdp(e.target.value)}
                  className="font-mono text-xs h-32"
                  placeholder="Paste the offer from your peer here..."
                />
              </div>

              <Button 
                onClick={handleConnect}
                className="w-full"
                size="lg"
                disabled={!offerSdp || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Answer...
                  </>
                ) : (
                  'Generate Answer'
                )}
              </Button>

              {answerSdp && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Connection Answer (Share this back)</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(answerSdp)}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea 
                    value={answerSdp}
                    readOnly
                    className="font-mono text-xs h-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Send this answer back to your peer to complete the connection
                  </p>
                </div>
              )}
            </>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This establishes an authenticated classical channel for BB84 protocol messages. 
              Make sure to exchange these credentials through a secure, out-of-band channel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionSetup;
