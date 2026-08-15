import { CryptoError } from './errors';
import { importHMACKey, verifyHMAC } from './crypto';

/**
 * JWT header structure
 */
export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  iss?: string; // Issuer
  sub?: string; // Subject
  aud?: string | string[]; // Audience
  exp?: number; // Expiration Time
  nbf?: number; // Not Before
  iat?: number; // Issued At
  jti?: string; // JWT ID
  [key: string]: any; // Custom claims
}

/**
 * Decoded JWT structure
 */
export interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

/**
 * JWT validation result
 */
export interface JWTValidationResult {
  isValid: boolean;
  isExpired: boolean;
  errors: string[];
  warnings: string[];
  expiresAt?: Date;
  issuedAt?: Date;
  notBefore?: Date;
}

/**
 * Base64URL decode (JWT uses base64url encoding, not standard base64).
 * Decodes the base64 bytes as UTF-8 via TextDecoder (no deprecated escape()).
 */
function base64urlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (error) {
    throw new CryptoError('Invalid base64url encoding in JWT');
  }
}

/**
 * Base64URL encode. Encodes UTF-8 via TextEncoder (no deprecated unescape()).
 */
function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode JWT without verification
 */
export function decodeJWT(token: string): DecodedJWT {
  if (typeof token !== 'string') {
    throw new CryptoError('JWT must be a string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new CryptoError('Invalid JWT format. Expected 3 parts separated by dots.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // Decode header
    const headerJson = base64urlDecode(headerB64);
    const header: JWTHeader = JSON.parse(headerJson);

    // Decode payload
    const payloadJson = base64urlDecode(payloadB64);
    const payload: JWTPayload = JSON.parse(payloadJson);

    return {
      header,
      payload,
      signature: signatureB64,
      raw: {
        header: headerB64,
        payload: payloadB64,
        signature: signatureB64
      }
    };
  } catch (error) {
    throw new CryptoError(`Failed to decode JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate JWT structure and claims (without signature verification)
 */
export function validateJWTStructure(decoded: DecodedJWT): JWTValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isExpired = false;

  // Validate header
  if (!decoded.header.alg) {
    errors.push('Missing algorithm in header');
  }

  if (!decoded.header.typ || decoded.header.typ.toLowerCase() !== 'jwt') {
    warnings.push('Token type should be "JWT"');
  }

  // Validate payload timing claims
  const now = Math.floor(Date.now() / 1000);

  if (decoded.payload.exp) {
    if (decoded.payload.exp < now) {
      isExpired = true;
      errors.push('Token has expired');
    }
  } else {
    warnings.push('Token does not have an expiration time (exp claim)');
  }

  if (decoded.payload.nbf && decoded.payload.nbf > now) {
    errors.push('Token is not yet valid (nbf claim)');
  }

  if (decoded.payload.iat && decoded.payload.iat > now) {
    warnings.push('Token issued in the future (iat claim)');
  }

  // Validate standard claims
  if (decoded.payload.iss && typeof decoded.payload.iss !== 'string') {
    errors.push('Issuer (iss) claim must be a string');
  }

  if (decoded.payload.sub && typeof decoded.payload.sub !== 'string') {
    errors.push('Subject (sub) claim must be a string');
  }

  if (decoded.payload.aud) {
    if (typeof decoded.payload.aud !== 'string' && !Array.isArray(decoded.payload.aud)) {
      errors.push('Audience (aud) claim must be a string or array of strings');
    }
  }

  return {
    isValid: errors.length === 0,
    isExpired,
    errors,
    warnings,
    expiresAt: decoded.payload.exp ? new Date(decoded.payload.exp * 1000) : undefined,
    issuedAt: decoded.payload.iat ? new Date(decoded.payload.iat * 1000) : undefined,
    notBefore: decoded.payload.nbf ? new Date(decoded.payload.nbf * 1000) : undefined
  };
}

/**
 * Verify JWT signature for HMAC algorithms (HS256, HS384, HS512)
 */
export async function verifyJWTSignatureHMAC(
  token: string,
  secret: string,
  algorithm: 'HS256' | 'HS384' | 'HS512' = 'HS256'
): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new CryptoError('Invalid JWT format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    // Import HMAC key
    const hashAlgorithm = {
      'HS256': 'SHA-256' as const,
      'HS384': 'SHA-384' as const,
      'HS512': 'SHA-512' as const
    }[algorithm];

    const key = await importHMACKey(secret, hashAlgorithm);

    // Convert signature from base64url to ArrayBuffer
    const signatureBytes = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

    // Verify signature
    return await verifyHMAC(signatureBytes.buffer, message, key, hashAlgorithm);

  } catch (error) {
    throw new CryptoError(`JWT signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get algorithm information
 */
export function getAlgorithmInfo(algorithm: string): {
  type: 'HMAC' | 'RSA' | 'ECDSA' | 'unknown';
  hashFunction: string;
  keyType: string;
  description: string;
} {
  const algorithmInfo: Record<string, any> = {
    'HS256': {
      type: 'HMAC',
      hashFunction: 'SHA-256',
      keyType: 'Symmetric (shared secret)',
      description: 'HMAC using SHA-256'
    },
    'HS384': {
      type: 'HMAC',
      hashFunction: 'SHA-384',
      keyType: 'Symmetric (shared secret)',
      description: 'HMAC using SHA-384'
    },
    'HS512': {
      type: 'HMAC',
      hashFunction: 'SHA-512',
      keyType: 'Symmetric (shared secret)',
      description: 'HMAC using SHA-512'
    },
    'RS256': {
      type: 'RSA',
      hashFunction: 'SHA-256',
      keyType: 'Asymmetric (RSA key pair)',
      description: 'RSA signature using SHA-256'
    },
    'RS384': {
      type: 'RSA',
      hashFunction: 'SHA-384',
      keyType: 'Asymmetric (RSA key pair)',
      description: 'RSA signature using SHA-384'
    },
    'RS512': {
      type: 'RSA',
      hashFunction: 'SHA-512',
      keyType: 'Asymmetric (RSA key pair)',
      description: 'RSA signature using SHA-512'
    },
    'ES256': {
      type: 'ECDSA',
      hashFunction: 'SHA-256',
      keyType: 'Asymmetric (ECDSA key pair)',
      description: 'ECDSA using P-256 curve and SHA-256'
    },
    'ES384': {
      type: 'ECDSA',
      hashFunction: 'SHA-384',
      keyType: 'Asymmetric (ECDSA key pair)',
      description: 'ECDSA using P-384 curve and SHA-384'
    },
    'ES512': {
      type: 'ECDSA',
      hashFunction: 'SHA-512',
      keyType: 'Asymmetric (ECDSA key pair)',
      description: 'ECDSA using P-521 curve and SHA-512'
    }
  };

  return algorithmInfo[algorithm] || {
    type: 'unknown',
    hashFunction: 'Unknown',
    keyType: 'Unknown',
    description: `Unknown algorithm: ${algorithm}`
  };
}

/**
 * Format JWT payload for display
 */
export function formatJWTPayload(payload: JWTPayload): Record<string, any> {
  const formatted: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    switch (key) {
      case 'exp':
      case 'iat':
      case 'nbf':
        formatted[key] = {
          timestamp: value,
          date: new Date(value * 1000).toISOString(),
          readable: new Date(value * 1000).toLocaleString()
        };
        break;
      default:
        formatted[key] = value;
    }
  }

  return formatted;
}

/**
 * Generate security recommendations for JWT
 */
export function getJWTSecurityRecommendations(decoded: DecodedJWT): string[] {
  const recommendations: string[] = [];

  // Algorithm recommendations
  if (decoded.header.alg === 'none') {
    recommendations.push('⚠️ Algorithm "none" provides no security. Use a proper signing algorithm.');
  }

  if (decoded.header.alg.startsWith('HS')) {
    recommendations.push('🔑 HMAC algorithms require a strong shared secret. Ensure the secret is randomly generated and kept secure.');
  }

  if (decoded.header.alg.startsWith('RS') || decoded.header.alg.startsWith('ES')) {
    recommendations.push('🔐 Asymmetric algorithms require proper key management. Keep private keys secure and rotate regularly.');
  }

  // Expiration recommendations
  if (!decoded.payload.exp) {
    recommendations.push('⏰ Consider adding an expiration time (exp claim) to limit token lifetime.');
  } else {
    const expTime = decoded.payload.exp * 1000;
    const issuedTime = (decoded.payload.iat || Math.floor(Date.now() / 1000)) * 1000;
    const lifetimeHours = (expTime - issuedTime) / (1000 * 60 * 60);

    if (lifetimeHours > 24) {
      recommendations.push('⏳ Token has a long lifetime. Consider shorter expiration times for better security.');
    }
  }

  // Audience recommendations
  if (!decoded.payload.aud) {
    recommendations.push('🎯 Consider adding an audience (aud claim) to specify the intended recipient.');
  }

  // Issuer recommendations
  if (!decoded.payload.iss) {
    recommendations.push('🏢 Consider adding an issuer (iss claim) to identify the token issuer.');
  }

  return recommendations;
}