import { CryptoError } from './errors';
import { md5 } from './md5';

/**
 * Supported hash algorithms
 */
export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

/**
 * Supported encryption algorithms
 */
export type EncryptionAlgorithm = 'AES-GCM' | 'RSA-OAEP';

/**
 * Supported signing algorithms for JWT
 */
export type SigningAlgorithm = 'HMAC' | 'RSA' | 'ECDSA';

/**
 * Hash generation options
 */
export interface HashOptions {
  algorithm: HashAlgorithm;
  format?: 'hex' | 'base64';
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  algorithm: EncryptionAlgorithm;
  keyUsage?: KeyUsage[];
  keyFormat?: 'raw' | 'pkcs8' | 'spki' | 'jwk';
}

/**
 * Key generation result
 */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Encryption result
 */
export interface EncryptionResult {
  ciphertext: ArrayBuffer;
  iv?: ArrayBuffer;
  authTag?: ArrayBuffer;
}

/**
 * Converts data to ArrayBuffer for crypto operations
 */
function toArrayBuffer(data: string | ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  if (typeof data === 'string') {
    return new TextEncoder().encode(data).buffer;
  }

  throw new CryptoError('Invalid data type for crypto operation');
}

/**
 * Converts ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  return Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const binaryString = Array.from(uint8Array)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
}

/**
 * Converts hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new CryptoError('Invalid hex string: length must be even');
  }

  const uint8Array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    uint8Array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return uint8Array.buffer;
}

/**
 * Generate cryptographic hash
 */
export async function generateHash(
  data: string | ArrayBuffer | Uint8Array,
  options: HashOptions = { algorithm: 'SHA-256' }
): Promise<string> {
  try {
    const buffer = toArrayBuffer(data);
    const { algorithm, format = 'hex' } = options;

    // Map our algorithm names to Web Crypto API names
    const algorithmMap: Record<HashAlgorithm, string> = {
      'MD5': 'MD5',
      'SHA-1': 'SHA-1',
      'SHA-256': 'SHA-256',
      'SHA-512': 'SHA-512'
    };

    const cryptoAlgorithm = algorithmMap[algorithm];
    if (!cryptoAlgorithm) {
      throw new CryptoError(`Unsupported hash algorithm: ${algorithm}`);
    }

    // Handle MD5 separately since it's not supported by Web Crypto API
    if (algorithm === 'MD5') {
      const hashHex = md5(data);
      return format === 'base64' ? btoa(hashHex.match(/.{2}/g)!.map(byte => String.fromCharCode(parseInt(byte, 16))).join('')) : hashHex;
    }

    const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, buffer);

    return format === 'base64' ? arrayBufferToBase64(hashBuffer) : arrayBufferToHex(hashBuffer);

  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(`Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate AES-GCM key
 */
export async function generateAESKey(keyLength: 128 | 256 = 256): Promise<CryptoKey> {
  try {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(`AES key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate RSA key pair
 */
export async function generateRSAKeyPair(keySize: 2048 | 3072 | 4096 = 2048): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: keySize,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256'
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  } catch (error) {
    throw new CryptoError(`RSA key pair generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate ECDSA key pair
 */
export async function generateECDSAKeyPair(curve: 'P-256' | 'P-384' | 'P-521' = 'P-256'): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: curve
      },
      true, // extractable
      ['sign', 'verify']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  } catch (error) {
    throw new CryptoError(`ECDSA key pair generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptAES(
  data: string | ArrayBuffer | Uint8Array,
  key: CryptoKey,
  iv?: Uint8Array
): Promise<EncryptionResult> {
  try {
    const buffer = toArrayBuffer(data);
    const initVector = iv || crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: initVector
      },
      key,
      buffer
    );

    return {
      ciphertext,
      iv: initVector.buffer
    };
  } catch (error) {
    throw new CryptoError(`AES encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptAES(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return plaintext;
  } catch (error) {
    throw new CryptoError(`AES decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt data using RSA-OAEP
 */
export async function encryptRSA(
  data: string | ArrayBuffer | Uint8Array,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    const buffer = toArrayBuffer(data);

    // RSA-OAEP has limits on data size
    if (buffer.byteLength > 190) { // Conservative limit for 2048-bit key
      throw new CryptoError('Data too large for RSA encryption. Use AES for large data.');
    }

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      buffer
    );

    return ciphertext;
  } catch (error) {
    throw new CryptoError(`RSA encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data using RSA-OAEP
 */
export async function decryptRSA(
  ciphertext: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      ciphertext
    );

    return plaintext;
  } catch (error) {
    throw new CryptoError(`RSA decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate HMAC signature
 */
export async function generateHMAC(
  data: string | ArrayBuffer | Uint8Array,
  key: CryptoKey,
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<ArrayBuffer> {
  try {
    const buffer = toArrayBuffer(data);

    const signature = await crypto.subtle.sign(
      {
        name: 'HMAC',
        hash: hashAlgorithm
      },
      key,
      buffer
    );

    return signature;
  } catch (error) {
    throw new CryptoError(`HMAC generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(
  signature: ArrayBuffer,
  data: string | ArrayBuffer | Uint8Array,
  key: CryptoKey,
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<boolean> {
  try {
    const buffer = toArrayBuffer(data);

    const isValid = await crypto.subtle.verify(
      {
        name: 'HMAC',
        hash: hashAlgorithm
      },
      key,
      signature,
      buffer
    );

    return isValid;
  } catch (error) {
    throw new CryptoError(`HMAC verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import HMAC key from raw data
 */
export async function importHMACKey(
  keyData: string | ArrayBuffer | Uint8Array,
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
): Promise<CryptoKey> {
  try {
    const buffer = toArrayBuffer(keyData);

    const key = await crypto.subtle.importKey(
      'raw',
      buffer,
      {
        name: 'HMAC',
        hash: hashAlgorithm
      },
      false, // not extractable
      ['sign', 'verify']
    );

    return key;
  } catch (error) {
    throw new CryptoError(`HMAC key import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export key to various formats
 */
export async function exportKey(
  key: CryptoKey,
  format: 'raw' | 'pkcs8' | 'spki' | 'jwk' = 'raw'
): Promise<ArrayBuffer | JsonWebKey> {
  try {
    return await crypto.subtle.exportKey(format, key);
  } catch (error) {
    throw new CryptoError(`Key export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate key strength and provide warnings
 */
export function validateKeyStrength(keyType: 'AES' | 'RSA' | 'ECDSA', keyLength: number): {
  isSecure: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let isSecure = true;

  switch (keyType) {
    case 'AES':
      if (keyLength < 256) {
        warnings.push('AES-128 may not provide adequate security for sensitive data');
        recommendations.push('Consider using AES-256 for better security');
        if (keyLength < 128) {
          isSecure = false;
        }
      }
      break;

    case 'RSA':
      if (keyLength < 2048) {
        warnings.push('RSA keys smaller than 2048 bits are considered weak');
        recommendations.push('Use at least 2048-bit RSA keys, preferably 3072 or 4096 bits');
        isSecure = false;
      } else if (keyLength < 3072) {
        recommendations.push('Consider using 3072 or 4096-bit keys for long-term security');
      }
      break;

    case 'ECDSA':
      if (keyLength < 256) {
        warnings.push('ECDSA curves smaller than P-256 may not be secure');
        recommendations.push('Use P-256, P-384, or P-521 curves');
        isSecure = false;
      }
      break;
  }

  return { isSecure, warnings, recommendations };
}

/**
 * Security warning for client-side crypto operations
 */
export function getClientSideCryptoWarning(): string {
  return `⚠️ CLIENT-SIDE CRYPTOGRAPHY WARNING:

• Key Management: Private keys are handled in browser memory. Ensure secure key storage practices.
• Random Number Generation: Uses Web Crypto API's secure random number generator.
• Key Exposure: Keys may be visible in browser developer tools and memory dumps.
• No Hardware Security: Operations don't use hardware security modules (HSMs).
• Storage Security: Avoid storing sensitive keys in localStorage or sessionStorage.

Recommendations:
• Use this tool for development, testing, or non-production scenarios
• For production systems, use server-side crypto or hardware security modules
• Never store private keys in browser storage
• Clear sensitive data from memory after use`;
}