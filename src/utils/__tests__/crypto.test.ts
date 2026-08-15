import { describe, it, expect } from 'vitest';
import {
  generateHash,
  generateAESKey,
  generateRSAKeyPair,
  generateECDSAKeyPair,
  encryptAES,
  decryptAES,
  encryptRSA,
  decryptRSA,
  generateHMAC,
  verifyHMAC,
  importHMACKey,
  validateKeyStrength,
  getClientSideCryptoWarning
} from '../crypto';
import { CryptoError } from '../errors';

describe('Cryptographic Utilities', () => {
  describe('Hash Generation', () => {
    it('should generate SHA-256 hash correctly', async () => {
      const data = 'Hello, World!';
      const hash = await generateHash(data, { algorithm: 'SHA-256' });

      expect(hash).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate SHA-512 hash correctly', async () => {
      const data = 'test';
      const hash = await generateHash(data, { algorithm: 'SHA-512' });

      expect(hash).toHaveLength(128); // SHA-512 produces 128 hex characters
      expect(typeof hash).toBe('string');
    });

    it('should generate MD5 hash correctly', async () => {
      const data = 'Hello, World!';
      const hash = await generateHash(data, { algorithm: 'MD5' });

      expect(hash).toBe('65a8e27d8879283831b664bd8b7f0ad4');
      expect(hash).toHaveLength(32); // MD5 produces 32 hex characters
    });

    it('should generate hash in base64 format', async () => {
      const data = 'test';
      const hash = await generateHash(data, { algorithm: 'SHA-256', format: 'base64' });

      expect(typeof hash).toBe('string');
      expect(hash).not.toMatch(/^[0-9a-f]+$/); // Should not be hex
      // Should be valid base64
      expect(() => atob(hash)).not.toThrow();
    });

    it('should handle ArrayBuffer input', async () => {
      const buffer = new TextEncoder().encode('test data');
      const hash = await generateHash(buffer, { algorithm: 'SHA-256' });

      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64);
    });

    it('should throw error for unsupported algorithm', async () => {
      await expect(generateHash('test', { algorithm: 'INVALID' as any }))
        .rejects
        .toThrow(CryptoError);
    });
  });

  describe('AES Key Generation and Operations', () => {
    it('should generate AES key successfully', async () => {
      const key = await generateAESKey(256);

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should encrypt and decrypt with AES-GCM', async () => {
      const key = await generateAESKey(256);
      const plaintext = 'Secret message';

      // Encrypt
      const encryptionResult = await encryptAES(plaintext, key);
      expect(encryptionResult.ciphertext).toBeInstanceOf(ArrayBuffer);
      expect(encryptionResult.iv).toBeInstanceOf(ArrayBuffer);

      // Decrypt
      const decryptedBuffer = await decryptAES(encryptionResult.ciphertext, key, encryptionResult.iv!);
      const decryptedText = new TextDecoder().decode(decryptedBuffer);

      expect(decryptedText).toBe(plaintext);
    });

    it('should use provided IV for AES encryption', async () => {
      const key = await generateAESKey(256);
      const plaintext = 'Test message';
      const customIV = crypto.getRandomValues(new Uint8Array(12));

      const result = await encryptAES(plaintext, key, customIV);
      expect(new Uint8Array(result.iv!)).toEqual(customIV);
    });
  });

  describe('RSA Key Generation and Operations', () => {
    it('should generate RSA key pair successfully', async () => {
      const keyPair = await generateRSAKeyPair(2048);

      expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.publicKey.type).toBe('public');
      expect(keyPair.privateKey.type).toBe('private');
    });

    it('should encrypt and decrypt with RSA-OAEP', async () => {
      const keyPair = await generateRSAKeyPair(2048);
      const plaintext = 'Short message'; // RSA has size limits

      // Encrypt with public key
      const ciphertext = await encryptRSA(plaintext, keyPair.publicKey);
      expect(ciphertext).toBeInstanceOf(ArrayBuffer);

      // Decrypt with private key
      const decryptedBuffer = await decryptRSA(ciphertext, keyPair.privateKey);
      const decryptedText = new TextDecoder().decode(decryptedBuffer);

      expect(decryptedText).toBe(plaintext);
    });

    it('should throw error for data too large for RSA', async () => {
      const keyPair = await generateRSAKeyPair(2048);
      const largePlaintext = 'x'.repeat(200); // Too large for RSA-OAEP

      await expect(encryptRSA(largePlaintext, keyPair.publicKey))
        .rejects
        .toThrow(CryptoError);
    });
  });

  describe('ECDSA Key Generation', () => {
    it('should generate ECDSA key pair successfully', async () => {
      const keyPair = await generateECDSAKeyPair('P-256');

      expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
      expect(keyPair.publicKey.type).toBe('public');
      expect(keyPair.privateKey.type).toBe('private');
    });

    it('should support different ECDSA curves', async () => {
      const curves: Array<'P-256' | 'P-384' | 'P-521'> = ['P-256', 'P-384', 'P-521'];

      for (const curve of curves) {
        const keyPair = await generateECDSAKeyPair(curve);
        expect(keyPair.publicKey).toBeInstanceOf(CryptoKey);
        expect(keyPair.privateKey).toBeInstanceOf(CryptoKey);
      }
    });
  });

  describe('HMAC Operations', () => {
    it('should generate and verify HMAC signature', async () => {
      const secret = 'my-secret-key';
      const message = 'Hello, World!';

      const key = await importHMACKey(secret);
      const signature = await generateHMAC(message, key);
      const isValid = await verifyHMAC(signature, message, key);

      expect(signature).toBeInstanceOf(ArrayBuffer);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong message', async () => {
      const secret = 'my-secret-key';
      const message = 'Hello, World!';
      const wrongMessage = 'Wrong message';

      const key = await importHMACKey(secret);
      const signature = await generateHMAC(message, key);
      const isValid = await verifyHMAC(signature, wrongMessage, key);

      expect(isValid).toBe(false);
    });

    it('should support different hash algorithms for HMAC', async () => {
      const secret = 'test-key';
      const message = 'test message';
      const algorithms: Array<'SHA-256' | 'SHA-384' | 'SHA-512'> = ['SHA-256', 'SHA-384', 'SHA-512'];

      for (const algorithm of algorithms) {
        const key = await importHMACKey(secret, algorithm);
        const signature = await generateHMAC(message, key, algorithm);
        const isValid = await verifyHMAC(signature, message, key, algorithm);

        expect(isValid).toBe(true);
      }
    });
  });

  describe('Key Strength Validation', () => {
    it('should validate AES key strength correctly', () => {
      const weak = validateKeyStrength('AES', 128);
      const strong = validateKeyStrength('AES', 256);
      const veryWeak = validateKeyStrength('AES', 64);

      expect(weak.isSecure).toBe(true);
      expect(weak.warnings.length).toBeGreaterThan(0);

      expect(strong.isSecure).toBe(true);
      expect(strong.warnings.length).toBe(0);

      expect(veryWeak.isSecure).toBe(false);
    });

    it('should validate RSA key strength correctly', () => {
      const weak = validateKeyStrength('RSA', 1024);
      const acceptable = validateKeyStrength('RSA', 2048);
      const strong = validateKeyStrength('RSA', 4096);

      expect(weak.isSecure).toBe(false);
      expect(weak.warnings.length).toBeGreaterThan(0);

      expect(acceptable.isSecure).toBe(true);
      expect(acceptable.recommendations.length).toBeGreaterThan(0);

      expect(strong.isSecure).toBe(true);
    });

    it('should validate ECDSA key strength correctly', () => {
      const weak = validateKeyStrength('ECDSA', 128);
      const strong = validateKeyStrength('ECDSA', 256);

      expect(weak.isSecure).toBe(false);
      expect(strong.isSecure).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should provide client-side crypto warning', () => {
      const warning = getClientSideCryptoWarning();

      expect(typeof warning).toBe('string');
      expect(warning).toContain('CLIENT-SIDE CRYPTOGRAPHY WARNING');
      expect(warning).toContain('Key Management');
      expect(warning).toContain('Recommendations');
    });
  });

  describe('Error Handling', () => {
    it('should throw CryptoError for invalid operations', async () => {
      // Test with invalid key for AES operations
      const invalidKey = {} as CryptoKey;

      await expect(encryptAES('test', invalidKey))
        .rejects
        .toThrow(CryptoError);
    });

    it('should handle invalid input data gracefully', async () => {
      await expect(generateHash(null as any))
        .rejects
        .toThrow(CryptoError);
    });
  });
});