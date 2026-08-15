/**
 * MD5 implementation for Web Crypto compatibility
 * Based on RFC 1321 specification
 */

/**
 * MD5 hash implementation
 * Note: MD5 is cryptographically weak and should only be used for non-security purposes
 */
export function md5(data: string | ArrayBuffer | Uint8Array): string {
  // Convert input to Uint8Array
  let bytes: Uint8Array;

  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }

  // MD5 constants
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];

  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];

  // Pre-processing: adding padding bits
  const msg = new Uint8Array(bytes);
  const msgLen = msg.length;
  const bitLen = msgLen * 8;

  // Append '1' bit (0x80)
  const paddedLength = msgLen + 1 + (64 - ((msgLen + 9) % 64)) % 64 + 8;
  const paddedMsg = new Uint8Array(paddedLength);
  paddedMsg.set(msg);
  paddedMsg[msgLen] = 0x80;

  // Append length as 64-bit little-endian integer
  const dataView = new DataView(paddedMsg.buffer);
  dataView.setUint32(paddedLength - 8, bitLen, true);
  dataView.setUint32(paddedLength - 4, Math.floor(bitLen / 0x100000000), true);

  // Initialize MD buffer
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  // Process message in 512-bit blocks
  for (let i = 0; i < paddedLength; i += 64) {
    const w = new Uint32Array(16);

    // Break chunk into sixteen 32-bit little-endian words
    for (let j = 0; j < 16; j++) {
      w[j] = dataView.getUint32(i + j * 4, true);
    }

    // Initialize hash value for this chunk
    let a = h0, b = h1, c = h2, d = h3;

    // Main loop
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;

      if (j < 16) {
        f = (b & c) | ((~b) & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | ((~d) & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | (~d));
        g = (7 * j) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b = add32(b, rotateLeft(add32(add32(a, f), add32(K[j], w[g])), s[j]));
      a = temp;
    }

    // Add this chunk's hash to result so far
    h0 = add32(h0, a);
    h1 = add32(h1, b);
    h2 = add32(h2, c);
    h3 = add32(h3, d);
  }

  // Produce the final hash value as a 128-bit number (little-endian)
  const result = new Uint8Array(16);
  const resultView = new DataView(result.buffer);

  resultView.setUint32(0, h0, true);
  resultView.setUint32(4, h1, true);
  resultView.setUint32(8, h2, true);
  resultView.setUint32(12, h3, true);

  // Convert to hex string
  return Array.from(result)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Add two 32-bit numbers with proper overflow handling
 */
function add32(a: number, b: number): number {
  return ((a + b) & 0xffffffff) >>> 0;
}

/**
 * Left rotate a 32-bit number by n bits
 */
function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}