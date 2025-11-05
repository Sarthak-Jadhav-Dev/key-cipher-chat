export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private onDataChannelOpenCallback: (() => void) | null = null;

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateCallback) {
        this.onConnectionStateCallback(this.pc.connectionState);
      }
    };
  }

  createDataChannel(channelName: string = 'bb84-channel'): void {
    if (!this.pc) return;

    this.dc = this.pc.createDataChannel(channelName);
    this.setupDataChannel();
  }

  onDataChannel(callback: () => void): void {
    if (!this.pc) return;

    this.pc.ondatachannel = (event) => {
      this.dc = event.channel;
      this.setupDataChannel();
      callback();
    };
  }

  private setupDataChannel(): void {
    if (!this.dc) return;

    this.dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.dc.onopen = () => {
      console.log('Data channel opened');
      if (this.onDataChannelOpenCallback) {
        this.onDataChannelOpenCallback();
      }
    };

    this.dc.onclose = () => {
      console.log('Data channel closed');
    };

    this.dc.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  async createOffer(): Promise<string> {
    if (!this.pc) throw new Error('No peer connection');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering();

    return JSON.stringify(this.pc.localDescription);
  }

  async handleOffer(offerSdp: string): Promise<string> {
    if (!this.pc) throw new Error('No peer connection');

    const offer = JSON.parse(offerSdp);
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering();

    return JSON.stringify(this.pc.localDescription);
  }

  async handleAnswer(answerSdp: string): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');

    const answer = JSON.parse(answerSdp);
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.pc) {
        resolve();
        return;
      }

      if (this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.pc?.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.pc.addEventListener('icegatheringstatechange', checkState);
    });
  }

  sendMessage(data: any): void {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(data));
    } else {
      console.warn('Data channel not open, cannot send message');
    }
  }

  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  onDataChannelOpen(callback: () => void): void {
    this.onDataChannelOpenCallback = callback;
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc?.connectionState || 'closed';
  }

  close(): void {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
