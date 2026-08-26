import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    type UserWithPassword,
    hashPassword,
    verifyPassword,
    upgradeHashIfNeeded,
} from '@/renderer/store/adapters/capacitor/crypto';

const mockWriteCollection = vi.fn().mockResolvedValue(undefined);

vi.mock('@/renderer/store/adapters/capacitor/db', () => ({
    writeCollection: (...args: unknown[]) => mockWriteCollection(...args),
}));

describe('capacitor/crypto', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('hashPassword', () => {
        it('produces a record in the shared format', async () => {
            const hash = await hashPassword('testpassword');
            expect(hash).toMatch(/^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
        });

        it('produces different hashes for same password (random salt)', async () => {
            const hash1 = await hashPassword('samepass');
            const hash2 = await hashPassword('samepass');
            expect(hash1).not.toBe(hash2);
        });

        it('produces different hashes for different passwords', async () => {
            const hash1 = await hashPassword('password1');
            const hash2 = await hashPassword('password2');
            expect(hash1.split('$')[3]).not.toBe(hash2.split('$')[3]);
        });
    });

    describe('verifyPassword', () => {
        it('returns true for correct password', async () => {
            const hash = await hashPassword('correct');
            expect(await verifyPassword('correct', hash)).toBe(true);
        });

        it('returns false for incorrect password', async () => {
            const hash = await hashPassword('correct');
            expect(await verifyPassword('wrong', hash)).toBe(false);
        });

        it('returns false for a malformed record', async () => {
            expect(await verifyPassword('test', 'pbkdf2$invalid')).toBe(false);
            expect(await verifyPassword('test', '')).toBe(false);
        });

        // The pre-unification mobile format, written at 100k iterations.
        it('still accepts a legacy pbkdf2: record', async () => {
            const salt = new Uint8Array(16).fill(7);
            const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('legacy-pw'), 'PBKDF2', false, [
                'deriveBits',
            ]);
            const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
                key,
                512,
            );
            const hex = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');

            expect(await verifyPassword('legacy-pw', `pbkdf2:${saltHex}:${hex}`)).toBe(true);
            expect(await verifyPassword('wrong', `pbkdf2:${saltHex}:${hex}`)).toBe(false);
        });

        it('handles legacy SHA-256 hashes', async () => {
            // Compute SHA-256 of 'legacy' manually
            const encoder = new TextEncoder();
            const buffer = await crypto.subtle.digest('SHA-256', encoder.encode('legacy'));
            const sha256Hex = Array.from(new Uint8Array(buffer))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            expect(await verifyPassword('legacy', sha256Hex)).toBe(true);
            expect(await verifyPassword('wrong', sha256Hex)).toBe(false);
        });
    });

    describe('upgradeHashIfNeeded', () => {
        it('upgrades a legacy SHA-256 hash to PBKDF2', async () => {
            const encoder = new TextEncoder();
            const buffer = await crypto.subtle.digest('SHA-256', encoder.encode('oldpass'));
            const sha256Hex = Array.from(new Uint8Array(buffer))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            const users: UserWithPassword[] = [
                { _id: '1', username: 'monk', password: sha256Hex, theme: 'dark', language: 'en' },
            ];

            await upgradeHashIfNeeded(users, 0, 'oldpass', 'users.json');

            expect(users[0].password).toMatch(/^pbkdf2\$600000\$/);
            expect(mockWriteCollection).toHaveBeenCalledWith('users.json', users);
        });

        it('does nothing if the record is already current', async () => {
            const hash = await hashPassword('modern');
            const users: UserWithPassword[] = [
                { _id: '1', username: 'monk', password: hash, theme: 'dark', language: 'en' },
            ];

            await upgradeHashIfNeeded(users, 0, 'modern', 'users.json');

            expect(mockWriteCollection).not.toHaveBeenCalled();
        });
    });
});
