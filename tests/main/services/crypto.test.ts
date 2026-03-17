// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { generateId, generateToken, hashPasswordPbkdf2, verifyPassword } from '../../../src/main/services/crypto';

// ─── generateId ───────────────────────────────────────────────────────────────

describe('generateId', () => {
    it('returns a non-empty string', () => {
        expect(generateId()).toBeTruthy();
    });

    it('returns unique values on successive calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });
});

// ─── generateToken ────────────────────────────────────────────────────────────

describe('generateToken', () => {
    it('returns a 64-character hex string', () => {
        const token = generateToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns unique tokens', () => {
        const a = generateToken();
        const b = generateToken();
        expect(a).not.toBe(b);
    });
});

// ─── hashPasswordPbkdf2 ──────────────────────────────────────────────────────

describe('hashPasswordPbkdf2', () => {
    it('returns an object with hash and salt', () => {
        const result = hashPasswordPbkdf2('test-password');
        expect(result).toHaveProperty('hash');
        expect(result).toHaveProperty('salt');
        expect(result.hash).toBeTruthy();
        expect(result.salt).toBeTruthy();
    });

    it('produces a deterministic hash given the same salt', () => {
        const { hash: h1, salt } = hashPasswordPbkdf2('password123');
        const { hash: h2 } = hashPasswordPbkdf2('password123', salt);
        expect(h1).toBe(h2);
    });

    it('produces different hashes for different passwords', () => {
        const salt = 'fixed-salt-for-test';
        const { hash: h1 } = hashPasswordPbkdf2('password-A', salt);
        const { hash: h2 } = hashPasswordPbkdf2('password-B', salt);
        expect(h1).not.toBe(h2);
    });

    it('generates a unique salt when none is provided', () => {
        const { salt: s1 } = hashPasswordPbkdf2('pw');
        const { salt: s2 } = hashPasswordPbkdf2('pw');
        expect(s1).not.toBe(s2);
    });
});

// ─── verifyPassword (PBKDF2 path) ────────────────────────────────────────────

describe('verifyPassword', () => {
    it('returns true for a correct PBKDF2 password', async () => {
        const { hash, salt } = hashPasswordPbkdf2('my-secret');
        const fakeUser = {
            _id: '1',
            username: 'u',
            passwordHash: hash,
            salt,
            theme: 'dark',
            language: 'en',
            stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
            createdAt: '',
        };
        expect(await verifyPassword('my-secret', fakeUser)).toBe(true);
    });

    it('returns false for an incorrect PBKDF2 password', async () => {
        const { hash, salt } = hashPasswordPbkdf2('my-secret');
        const fakeUser = {
            _id: '1',
            username: 'u',
            passwordHash: hash,
            salt,
            theme: 'dark',
            language: 'en',
            stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
            createdAt: '',
        };
        expect(await verifyPassword('wrong-password', fakeUser)).toBe(false);
    });

    it('returns false when user has no password fields', async () => {
        const fakeUser = {
            _id: '1',
            username: 'u',
            theme: 'dark',
            language: 'en',
            stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
            createdAt: '',
        };
        expect(await verifyPassword('anything', fakeUser)).toBe(false);
    });
});
