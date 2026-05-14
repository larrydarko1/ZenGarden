/**
 * crypto — password hashing, verification, and token/ID generation.
 * Owns: Argon2 / PBKDF2 hashing, password verification, token generation, ID generation.
 * Does NOT own: user storage (db.ts), IPC handlers (auth.ts).
 */

import crypto from 'crypto';
import type { StoredUser } from './db';

// ─── ID / Token ───────────────────────────────────────────────────────────────

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

// Hash with Argon2 if available (preferred), fall back to PBKDF2
export async function hashPassword(password: string): Promise<string | { hash: string; salt: string }> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const argon2 = require('argon2') as { hash: (p: string) => Promise<string> };
        return await argon2.hash(password);
    } catch {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
        return { hash, salt };
    }
}

export function hashPasswordPbkdf2(password: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt ?? crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha256').toString('hex');
    return { hash, salt: useSalt };
}

// ─── Recovery codes ───────────────────────────────────────────────────────────

// Generate 10 random 8-char alphanumeric recovery codes
export function generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        const bytes = crypto.randomBytes(6);
        codes.push(bytes.toString('base64url').substring(0, 8).toUpperCase());
    }
    return codes;
}

// Hash a single recovery code for storage
export function hashRecoveryCode(code: string): { hash: string; salt: string } {
    return hashPasswordPbkdf2(code.toUpperCase());
}

// Verify a recovery code against a stored hash
export function verifyRecoveryCode(code: string, storedHash: string, salt: string): boolean {
    const { hash } = hashPasswordPbkdf2(code.toUpperCase(), salt);
    return hash === storedHash;
}

// ─── Verification ─────────────────────────────────────────────────────────────

export async function verifyPassword(password: string, user: StoredUser): Promise<boolean> {
    // Argon2 path — full hash string stored in user.password
    if (user.password?.startsWith('$argon2')) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const argon2 = require('argon2') as { verify: (h: string, p: string) => Promise<boolean> };
            return await argon2.verify(user.password, password);
        } catch {
            return false;
        }
    }

    // PBKDF2 path — split hash + salt fields
    if (user.passwordHash && user.salt) {
        const { hash } = hashPasswordPbkdf2(password, user.salt);
        return hash === user.passwordHash;
    }

    return false;
}
