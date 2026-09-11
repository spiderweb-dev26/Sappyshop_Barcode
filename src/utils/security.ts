/**
 * Sappy POS Cryptographic Security & Encryption Utility
 * Provides SHA-256 cryptographic hashing for PINs/passwords,
 * credential verification, and data encryption for sensitive store sessions.
 */

const SALT = 'sappy_stationary_pos_secure_salt_v2';

/**
 * Standard SHA-256 cryptographic hash (Synchronous, Web & Node compatible)
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // Non-ASCII fallback
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }

  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const t1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const t2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      hash = [(t1 + t2) | 0, hash[0], hash[1], hash[2], (hash[3] + t1) | 0, hash[4], hash[5], hash[6]];
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16 ? '0' : '') + b.toString(16));
    }
  }
  return result;
}

/**
 * Hash a PIN or password with salt
 */
export function hashCredential(credential: string, customSalt: string = SALT): string {
  if (!credential) return '';
  return sha256(`${customSalt}:${credential.trim()}`);
}

/**
 * Check if a stored value is already a 64-character SHA-256 hash
 */
export function isHashed(val: string): boolean {
  return typeof val === 'string' && /^[0-9a-f]{64}$/i.test(val.trim());
}

/**
 * Verify input credential against stored PIN or password hash.
 * Supports backward-compatible migration if stored credential is still in plain text.
 */
export function verifyCredential(input: string, storedHashOrPlain: string): boolean {
  if (!input || !storedHashOrPlain) return false;
  const cleanInput = input.trim();
  const cleanStored = storedHashOrPlain.trim();

  // 1. Direct match with SHA-256 hashed credential
  const computedHash = hashCredential(cleanInput);
  if (computedHash === cleanStored) {
    return true;
  }

  // 2. Backward compatibility: if the record was previously stored unhashed
  if (cleanStored === cleanInput) {
    return true;
  }

  return false;
}

/**
 * Verify Master Passcode (supports plain and hashed checks)
 */
export function verifyMasterCode(input: string, expectedMasterPasscode: string): boolean {
  if (!input || !expectedMasterPasscode) return false;
  const clean = input.trim();
  if (clean === expectedMasterPasscode.trim()) return true;
  if (hashCredential(clean) === hashCredential(expectedMasterPasscode.trim())) return true;
  return false;
}

/**
 * Reversible symmetric encryption for sensitive local session data
 */
export function encryptData(data: string, secretKey: string = SALT): string {
  try {
    const keyBytes = secretKey.split('').map(c => c.charCodeAt(0));
    const encryptedBytes: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const k = keyBytes[i % keyBytes.length];
      encryptedBytes.push(charCode ^ k);
    }
    return btoa(JSON.stringify(encryptedBytes));
  } catch {
    return data;
  }
}

/**
 * Decrypt data encrypted with encryptData
 */
export function decryptData(encrypted: string, secretKey: string = SALT): string | null {
  try {
    const keyBytes = secretKey.split('').map(c => c.charCodeAt(0));
    const bytes: number[] = JSON.parse(atob(encrypted));
    if (!Array.isArray(bytes)) return null;
    const chars = bytes.map((b, i) => String.fromCharCode(b ^ keyBytes[i % keyBytes.length]));
    return chars.join('');
  } catch {
    return null;
  }
}
