/**
 * TOTP implementation (RFC 6238) using only Node.js crypto.
 * No external dependencies required.
 */
import 'server-only';
import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  const padded = bits.padEnd(Math.ceil(bits.length / 5) * 5, '0');
  let result = '';
  for (let i = 0; i < padded.length; i += 5) {
    result += BASE32_ALPHABET[parseInt(padded.slice(i, i + 5), 2)];
  }
  return result;
}

function base32Decode(str: string): Buffer {
  const input = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of input) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Invalid base32 character: ${char}`);
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeHotp(key: Buffer, counter: number, digits = 6): string {
  const counterBuffer = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  counterBuffer.writeUInt32BE(high, 0);
  counterBuffer.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (hash.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, digits);
  return code.toString().padStart(digits, '0');
}

/** Generate a cryptographically random base32 TOTP secret (20 bytes = 160 bits) */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Generate the current TOTP token for a given secret */
export function generateTotp(secret: string, timeStep = 30, digits = 6): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return computeHotp(key, counter, digits);
}

/**
 * Verify a TOTP token within a ±window time steps.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyTotp(token: string, secret: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const timeStep = 30;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000 / timeStep);

  for (let i = -window; i <= window; i++) {
    const generated = computeHotp(key, now + i);
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(generated.padEnd(6, '0')),
          Buffer.from(token.padEnd(6, '0'))
        )
      ) {
        return true;
      }
    } catch {
      // length mismatch — not equal
    }
  }
  return false;
}

/** Build an otpauth:// URI for QR code scanners (Google Authenticator, Authy, etc.) */
export function getTotpUri(secret: string, email: string, issuer = 'LawHub Admin'): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}

/** Generate one-time recovery codes (8 random codes, each 8 hex chars) */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

/** Hash a recovery code for secure DB storage */
export function hashRecoveryCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().trim())
    .digest('hex');
}

/** Verify a recovery code against a list of hashed codes; returns remaining codes or null */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): string[] | null {
  const inputHash = hashRecoveryCode(inputCode);
  const idx = hashedCodes.findIndex((h) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(inputHash));
    } catch {
      return false;
    }
  });
  if (idx === -1) return null;
  // Remove the used code
  return hashedCodes.filter((_, i) => i !== idx);
}
