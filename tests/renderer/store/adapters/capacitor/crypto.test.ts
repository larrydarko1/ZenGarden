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
        it('produces a PBKDF2-prefixed hash', async () => {
            const hash = await hashPassword('testpassword');
            expect(hash).toMatch(/^pbkdf2:[0-9a-f]+:[0-9a-f]+$/);
        });

        it('produces different hashes for same password (random salt)', async () => {
            const hash1 = await hashPassword('samepass');
            const hash2 = await hashPassword('samepass');
            expect(hash1).not.toBe(hash2);
        });

        it('produces different hashes for different passwords', async () => {
            const hash1 = await hashPassword('password1');
            const hash2 = await hashPassword('password2');
            const parts1 = hash1.split(':');
            const parts2 = hash2.split(':');
            // Derived keys should differ
            expect(parts1[2]).not.toBe(parts2[2]);
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

        it('returns false for malformed PBKDF2 hash', async () => {
            expect(await verifyPassword('test', 'pbkdf2:invalid')).toBe(false);
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

            expect(users[0].password).toMatch(/^pbkdf2:/);
            expect(mockWriteCollection).toHaveBeenCalledWith('users.json', users);
        });

        it('does nothing if hash is already PBKDF2', async () => {
            const hash = await hashPassword('modern');
            const users: UserWithPassword[] = [
                { _id: '1', username: 'monk', password: hash, theme: 'dark', language: 'en' },
            ];

            await upgradeHashIfNeeded(users, 0, 'modern', 'users.json');

            expect(mockWriteCollection).not.toHaveBeenCalled();
        });
    });
});
