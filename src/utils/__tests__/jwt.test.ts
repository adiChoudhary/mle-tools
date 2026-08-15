import { describe, it, expect } from 'vitest';
import {
  decodeJWT,
  validateJWTStructure,
  verifyJWTSignatureHMAC,
  getAlgorithmInfo,
  formatJWTPayload,
  getJWTSecurityRecommendations
} from '../jwt';
import { CryptoError } from '../errors';

describe('JWT Utilities', () => {
  // Valid JWT for testing (HS256, secret: 'secret')
  const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.vuln5dRinCcYQE97uKQTX3_lIC1lzA1XRWCBxqcPWvE';

  // Expired JWT
  const expiredJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4twFt5NiznN84AWoo1d7KO1T_yoc0Z6XOpOVswacPZg';

  describe('JWT Decoding', () => {
    it('should decode valid JWT correctly', () => {
      const decoded = decodeJWT(validJWT);

      expect(decoded.header).toEqual({
        alg: 'HS256',
        typ: 'JWT'
      });

      expect(decoded.payload.sub).toBe('1234567890');
      expect(decoded.payload.name).toBe('John Doe');
      expect(decoded.payload.iat).toBe(1516239022);
      expect(decoded.signature).toBe('vuln5dRinCcYQE97uKQTX3_lIC1lzA1XRWCBxqcPWvE');
    });

    it('should throw error for invalid JWT format', () => {
      expect(() => decodeJWT('invalid.jwt')).toThrow(CryptoError);
      expect(() => decodeJWT('invalid')).toThrow(CryptoError);
      expect(() => decodeJWT('')).toThrow(CryptoError);
    });

    it('should throw error for non-string input', () => {
      expect(() => decodeJWT(null as any)).toThrow(CryptoError);
      expect(() => decodeJWT(123 as any)).toThrow(CryptoError);
    });

    it('should handle JWT with invalid base64 encoding', () => {
      const invalidBase64JWT = 'invalid@base64.invalid@base64.invalid@base64';
      expect(() => decodeJWT(invalidBase64JWT)).toThrow(CryptoError);
    });

    it('should handle JWT with invalid JSON', () => {
      // Create JWT with invalid JSON payload
      const invalidJsonHeader = btoa('invalid json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const validPayload = 'eyJzdWIiOiIxMjM0NTY3ODkwIn0';
      const validSignature = 'signature';
      const invalidJWT = `${invalidJsonHeader}.${validPayload}.${validSignature}`;

      expect(() => decodeJWT(invalidJWT)).toThrow(CryptoError);
    });
  });

  describe('JWT Structure Validation', () => {
    it('should validate valid JWT structure', () => {
      const decoded = decodeJWT(validJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.isValid).toBe(true);
      expect(validation.isExpired).toBe(false);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect expired JWT', () => {
      const decoded = decodeJWT(expiredJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.isValid).toBe(false);
      expect(validation.isExpired).toBe(true);
      expect(validation.errors).toContain('Token has expired');
    });

    it('should warn about missing expiration', () => {
      // Create JWT without exp claim
      const noExpJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature';
      const decoded = decodeJWT(noExpJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.warnings).toContain('Token does not have an expiration time (exp claim)');
    });

    it('should handle missing algorithm in header', () => {
      const noAlgHeader = btoa(JSON.stringify({ typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const payload = 'eyJzdWIiOiIxMjM0NTY3ODkwIn0';
      const signature = 'signature';
      const noAlgJWT = `${noAlgHeader}.${payload}.${signature}`;

      const decoded = decodeJWT(noAlgJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.errors).toContain('Missing algorithm in header');
    });

    it('should validate timing claims correctly', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past

      const payload = {
        sub: '1234567890',
        nbf: futureTime, // Not before in future
        iat: futureTime  // Issued at in future
      };

      const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const signature = 'signature';
      const testJWT = `${header}.${payloadB64}.${signature}`;

      const decoded = decodeJWT(testJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.errors).toContain('Token is not yet valid (nbf claim)');
      expect(validation.warnings).toContain('Token issued in the future (iat claim)');
    });

    it('should provide formatted dates', () => {
      const decoded = decodeJWT(validJWT);
      const validation = validateJWTStructure(decoded);

      expect(validation.issuedAt).toBeInstanceOf(Date);
      expect(validation.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('JWT Signature Verification', () => {
    it('should verify valid HMAC signature', async () => {
      const isValid = await verifyJWTSignatureHMAC(validJWT, 'secret', 'HS256');
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', async () => {
      const isValid = await verifyJWTSignatureHMAC(validJWT, 'wrong-secret', 'HS256');
      expect(isValid).toBe(false);
    });

    it('should handle different HMAC algorithms', async () => {
      // Note: These JWTs would need to be generated with the respective algorithms
      // For now, we'll test that the function accepts the algorithm parameters
      await expect(verifyJWTSignatureHMAC(validJWT, 'secret', 'HS256')).resolves.toBeDefined();
      await expect(verifyJWTSignatureHMAC(validJWT, 'secret', 'HS384')).resolves.toBeDefined();
      await expect(verifyJWTSignatureHMAC(validJWT, 'secret', 'HS512')).resolves.toBeDefined();
    });

    it('should throw error for invalid JWT format in verification', async () => {
      await expect(verifyJWTSignatureHMAC('invalid.jwt', 'secret'))
        .rejects
        .toThrow(CryptoError);
    });
  });

  describe('Algorithm Information', () => {
    it('should provide correct algorithm information for HMAC', () => {
      const info = getAlgorithmInfo('HS256');

      expect(info.type).toBe('HMAC');
      expect(info.hashFunction).toBe('SHA-256');
      expect(info.keyType).toBe('Symmetric (shared secret)');
      expect(info.description).toBe('HMAC using SHA-256');
    });

    it('should provide correct algorithm information for RSA', () => {
      const info = getAlgorithmInfo('RS256');

      expect(info.type).toBe('RSA');
      expect(info.hashFunction).toBe('SHA-256');
      expect(info.keyType).toBe('Asymmetric (RSA key pair)');
    });

    it('should provide correct algorithm information for ECDSA', () => {
      const info = getAlgorithmInfo('ES256');

      expect(info.type).toBe('ECDSA');
      expect(info.hashFunction).toBe('SHA-256');
      expect(info.keyType).toBe('Asymmetric (ECDSA key pair)');
    });

    it('should handle unknown algorithms', () => {
      const info = getAlgorithmInfo('UNKNOWN');

      expect(info.type).toBe('unknown');
      expect(info.description).toContain('Unknown algorithm');
    });
  });

  describe('JWT Payload Formatting', () => {
    it('should format timestamps correctly', () => {
      const decoded = decodeJWT(validJWT);
      const formatted = formatJWTPayload(decoded.payload);

      expect(formatted.iat).toHaveProperty('timestamp');
      expect(formatted.iat).toHaveProperty('date');
      expect(formatted.iat).toHaveProperty('readable');
      expect(formatted.iat.timestamp).toBe(1516239022);
    });

    it('should preserve non-timestamp fields', () => {
      const decoded = decodeJWT(validJWT);
      const formatted = formatJWTPayload(decoded.payload);

      expect(formatted.sub).toBe('1234567890');
      expect(formatted.name).toBe('John Doe');
    });
  });

  describe('Security Recommendations', () => {
    it('should recommend against "none" algorithm', () => {
      const noneAlgJWT = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.';
      const decoded = decodeJWT(noneAlgJWT);
      const recommendations = getJWTSecurityRecommendations(decoded);

      expect(recommendations.some(r => r.includes('Algorithm "none"'))).toBe(true);
    });

    it('should provide HMAC key recommendations', () => {
      const decoded = decodeJWT(validJWT);
      const recommendations = getJWTSecurityRecommendations(decoded);

      expect(recommendations.some(r => r.includes('HMAC algorithms require'))).toBe(true);
    });

    it('should recommend expiration time when missing', () => {
      const noExpJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      const decoded = decodeJWT(noExpJWT);
      const recommendations = getJWTSecurityRecommendations(decoded);

      expect(recommendations.some(r => r.includes('expiration time'))).toBe(true);
    });

    it('should warn about long token lifetime', () => {
      // Create JWT with very long expiration
      const longExpPayload = {
        sub: '1234567890',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
      };

      const payloadB64 = btoa(JSON.stringify(longExpPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const longExpJWT = `${header}.${payloadB64}.signature`;

      const decoded = decodeJWT(longExpJWT);
      const recommendations = getJWTSecurityRecommendations(decoded);

      expect(recommendations.some(r => r.includes('long lifetime'))).toBe(true);
    });

    it('should recommend audience and issuer claims', () => {
      const minimalJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      const decoded = decodeJWT(minimalJWT);
      const recommendations = getJWTSecurityRecommendations(decoded);

      expect(recommendations.some(r => r.includes('audience'))).toBe(true);
      expect(recommendations.some(r => r.includes('issuer'))).toBe(true);
    });
  });
});