/**
 * crypto — password hashing, verification, and token/ID generation.
 * Owns: PBKDF2 derivation on the desktop, password and recovery-code
 * verification, token generation, ID generation.
 * Does NOT own: the record format both platforms share (@/schemas/password),
 * user storage (db.ts), IPC handlers (auth.ts).
 */
import crypto from 'crypto';
import {
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_BYTES,
    PBKDF2_SALT_BYTES,
    RECOVERY_CODE_COUNT,
    formatPbkdf2Record,
    generateRecoveryCode,
    needsRehash,
    parsePbkdf2Record,
    timingSafeEqualHex,
} from '@/schemas/password';
import type { StoredUser } from '@/main/services/db';

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/** Derives a record in the shared format. The salt is new on every call. */
export function hashSecret(secret: string): string {
    const salt = crypto.randomBytes(PBKDF2_SALT_BYTES);
    const saltHex = salt.toString('hex');
    return formatPbkdf2Record(PBKDF2_ITERATIONS, saltHex, derive(secret, salt, PBKDF2_ITERATIONS));
}

/**
 * Hashes `password` and writes it onto `user`, clearing the legacy fields so
 * verifyPassword cannot later match a stale one. Registration and every
 * password change go through here, which is what stops a changed password from
 * being stored more weakly than the one it replaced.
 */
export function setPassword(user: StoredUser, password: string): void {
    user.password = hashSecret(password);
    delete user.passwordHash;
    delete user.salt;
}

/**
 * Migrates `user` onto the current format when its stored password predates it,
 * and reports whether it did so the caller knows to persist the record. Called
 * on a successful login, which is the only moment the plaintext is available to
 * rehash from.
 */
export function rehashIfNeeded(user: StoredUser, password: string): boolean {
    if (user.passwordHash === undefined && !needsRehash(user.password)) return false;
    setPassword(user, password);
    return true;
}

export function generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
}

/**
 * Hashes a plaintext code into the record stored on the user. Recovery codes
 * share the password format; `salt` stays empty for record-shape compatibility
 * and is what tells verifyRecoveryCode this is not a legacy split record.
 */
export function hashRecoveryCode(code: string): { hash: string; salt: string; used: boolean } {
    return { hash: hashSecret(code.toUpperCase()), salt: '', used: false };
}

export function verifyRecoveryCode(code: string, storedHash: string, salt: string): boolean {
    const normalised = code.toUpperCase();
    if (salt !== '') return verifyLegacySplit(normalised, storedHash, salt);
    return verifySecret(normalised, storedHash);
}

export async function verifyPassword(password: string, user: StoredUser): Promise<boolean> {
    // Legacy: Argon2, written by desktop builds before the formats were unified.
    if (user.password?.startsWith('$argon2') === true) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const argon2 = require('argon2') as { verify: (h: string, p: string) => Promise<boolean> };
            return await argon2.verify(user.password, password);
        } catch {
            return false;
        }
    }

    // Legacy: PBKDF2 split across passwordHash + salt at the old iteration count.
    const { passwordHash, salt } = user;
    if (passwordHash !== undefined && salt !== undefined) {
        return verifyLegacySplit(password, passwordHash, salt);
    }

    return user.password !== undefined && verifySecret(password, user.password);
}

/** Verifies against a current-format record, whatever iteration count it names. */
function verifySecret(secret: string, stored: string): boolean {
    const parsed = parsePbkdf2Record(stored);
    if (parsed === null) return false;
    const salt = Buffer.from(parsed.saltHex, 'hex');
    return timingSafeEqualHex(derive(secret, salt, parsed.iterations), parsed.hashHex);
}

/**
 * The pre-unification shape: a bare hex digest beside its salt, always 100k
 * iterations. Note the salt goes in as the hex *string* rather than the bytes it
 * spells — that is what these records were derived with, so decoding it here
 * would lock out everyone holding one. The shared format decodes; this does not.
 */
function verifyLegacySplit(secret: string, storedHash: string, salt: string): boolean {
    return timingSafeEqualHex(derive(secret, salt, 100_000), storedHash);
}

function derive(secret: string, salt: crypto.BinaryLike, iterations: number): string {
    return crypto.pbkdf2Sync(secret, salt, iterations, PBKDF2_KEY_BYTES, 'sha256').toString('hex');
}
