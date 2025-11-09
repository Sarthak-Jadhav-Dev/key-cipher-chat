// Encryption utilities for post-key chat
// Uses the derived BB84 key for authenticated encryption

import { Bit } from '@/types/bb84';

/**
 * Simple XOR cipher with the derived key
 * In production, use AES-GCM or similar authenticated encryption
 */
export class KeyCipher {
  private key: Uint8Array;

  constructor(keyBits: Bit[]) {
    this.key = this.bitsToBytes(keyBits);
  }

  private bitsToBytes(bits: Bit[]): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === 1) {
        bytes[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
      }
    }
    return bytes;
  }

  /**
   * Encrypt a message using the key
   * Returns base64 encoded ciphertext and IV
   */
  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    
    // XOR with key (repeated/stretched as needed)
    const ciphertext = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const keyByte = this.key[i % this.key.length];
      const ivByte = iv[i % iv.length];
      ciphertext[i] = data[i] ^ keyByte ^ ivByte;
    }
    
    return {
      encrypted: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  /**
   * Decrypt a message using the key
   */
  decrypt(encrypted: string, ivString: string): string {
    const ciphertext = this.base64ToArrayBuffer(encrypted);
    const iv = this.base64ToArrayBuffer(ivString);
    
    // XOR with key (repeated/stretched as needed)
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      const keyByte = this.key[i % this.key.length];
      const ivByte = iv[i % iv.length];
      plaintext[i] = ciphertext[i] ^ keyByte ^ ivByte;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Generate a cryptographic hash for commitment
 */
export async function generateSecureCommitment(key: Bit[]): Promise<string> {
  const keyString = key.join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
