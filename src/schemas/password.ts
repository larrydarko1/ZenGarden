/**
 * password — the on-disk format for hashed passwords and recovery codes.
 * Owns: the PBKDF2 record string both platforms read and write, its parameters,
 * and recovery-code generation.
 * Does NOT own: key derivation itself — the desktop derives with Node's
 * `crypto.pbkdf2Sync` (main/services/crypto.ts) and Android with Web Crypto
 * (store/adapters/capacitor/crypto.ts), because only the format has to match.
 * That it matches is the point. A `users.json` copied from a laptop to a phone
 * used to fail every login: the two sides wrote different shapes and each read
 * the other's as a wrong password. One format means an account survives the
 * copy that the README already tells people to make.
 */

export type Pbkdf2Record = {
    iterations: number;
    saltHex: string;
    hashHex: string;
};

/**
 * OWASP's current figure for PBKDF2-HMAC-SHA256. Stored inside each record
 * rather than assumed, so raising it later leaves older records verifiable
 * instead of locking their owners out.
 */
export const PBKDF2_ITERATIONS = 600_000;

export const PBKDF2_KEY_BYTES = 64;

export const PBKDF2_SALT_BYTES = 16;

export const RECOVERY_CODE_COUNT = 10;

export const RECOVERY_CODE_LENGTH = 10;

/** `pbkdf2$<iterations>$<saltHex>$<hashHex>` — one field, so it fits both schemas. */
export function formatPbkdf2Record(iterations: number, saltHex: string, hashHex: string): string {
    return `pbkdf2$${String(iterations)}$${saltHex}$${hashHex}`;
}

/** Returns null for anything that is not a current-format record, legacy included. */
export function parsePbkdf2Record(stored: string): Pbkdf2Record | null {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return null;

    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations <= 0) return null;
    if (!/^[0-9a-f]+$/.test(parts[2]) || !/^[0-9a-f]+$/.test(parts[3])) return null;

    return { iterations, saltHex: parts[2], hashHex: parts[3] };
}

/**
 * True when a record should be rewritten on the next successful login: it is
 * legacy, or it is current-format but below the iteration count we now use.
 */
export function needsRehash(stored: string | undefined): boolean {
    if (stored === undefined || stored === '') return true;
    const parsed = parsePbkdf2Record(stored);
    return parsed === null || parsed.iterations < PBKDF2_ITERATIONS;
}

/**
 * Crockford base32: uppercase only, with I/L/O/U removed so nothing reads as a
 * digit. Every symbol survives case-folding unchanged, which is what keeps a
 * code's entropy intact — the alphabet is 32 symbols, so a byte maps onto it
 * without modulo bias.
 */
export function generateRecoveryCode(): string {
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const bytes = new Uint8Array(RECOVERY_CODE_LENGTH);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Pinned to ArrayBuffer, not ArrayBufferLike, so the result satisfies BufferSource. */
export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
}

/**
 * Constant-time comparison of two hex digests. A length mismatch means the
 * stored value is malformed rather than merely wrong, so it cannot be a match.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}
