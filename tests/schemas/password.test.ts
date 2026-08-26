import { vi, describe, it, expect } from 'vitest';
import {
    PBKDF2_ITERATIONS,
    RECOVERY_CODE_COUNT,
    RECOVERY_CODE_LENGTH,
    formatPbkdf2Record,
    generateRecoveryCode,
    needsRehash,
    parsePbkdf2Record,
    timingSafeEqualHex,
} from '@/schemas/password';
import { hashSecret, verifyPassword as verifyDesktop } from '@/main/services/crypto';
import { hashPassword as hashMobile, verifyPassword as verifyMobile } from '@/renderer/store/adapters/capacitor/crypto';

vi.mock('@/renderer/store/adapters/capacitor/db', () => ({
    writeCollection: vi.fn().mockResolvedValue(undefined),
}));

function desktopUser(password: string) {
    return {
        _id: '1',
        username: 'monk',
        password,
        theme: 'dark',
        language: 'en',
        stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
        createdAt: '',
    };
}

/**
 * The reason this module exists. The README tells people to copy their data
 * folder between devices; before the formats were unified each side read the
 * other's record as a wrong password, so a copied account could never log in.
 */
describe('desktop and Android record portability', () => {
    it('verifies a desktop-written password on Android', async () => {
        const record = hashSecret('shared-password');
        expect(await verifyMobile('shared-password', record)).toBe(true);
        expect(await verifyMobile('wrong-password', record)).toBe(false);
    });

    it('verifies an Android-written password on the desktop', async () => {
        const record = await hashMobile('shared-password');
        expect(await verifyDesktop('shared-password', desktopUser(record))).toBe(true);
        expect(await verifyDesktop('wrong-password', desktopUser(record))).toBe(false);
    });

    it('agrees on the record shape from both sides', async () => {
        const parsedDesktop = parsePbkdf2Record(hashSecret('pw'));
        const parsedMobile = parsePbkdf2Record(await hashMobile('pw'));

        expect(parsedDesktop).not.toBeNull();
        expect(parsedMobile).not.toBeNull();
        expect(parsedDesktop?.iterations).toBe(parsedMobile?.iterations);
        expect(parsedDesktop?.saltHex.length).toBe(parsedMobile?.saltHex.length);
        expect(parsedDesktop?.hashHex.length).toBe(parsedMobile?.hashHex.length);
    });
});

describe('parsePbkdf2Record', () => {
    it('round-trips a formatted record', () => {
        const parsed = parsePbkdf2Record(formatPbkdf2Record(600_000, 'abcd', 'ef01'));
        expect(parsed).toEqual({ iterations: 600_000, saltHex: 'abcd', hashHex: 'ef01' });
    });

    it.each([
        ['legacy argon2', '$argon2id$v=19$m=65536$abc$def'],
        ['legacy mobile', 'pbkdf2:abcd:ef01'],
        ['bare sha256 hex', 'a'.repeat(64)],
        ['wrong field count', 'pbkdf2$600000$abcd'],
        ['non-numeric iterations', 'pbkdf2$many$abcd$ef01'],
        ['zero iterations', 'pbkdf2$0$abcd$ef01'],
        ['non-hex salt', 'pbkdf2$600000$zzzz$ef01'],
        ['empty', ''],
    ])('returns null for %s', (_label, value) => {
        expect(parsePbkdf2Record(value)).toBeNull();
    });
});

describe('needsRehash', () => {
    it('is true for a legacy or missing record', () => {
        expect(needsRehash(undefined)).toBe(true);
        expect(needsRehash('')).toBe(true);
        expect(needsRehash('pbkdf2:abcd:ef01')).toBe(true);
        expect(needsRehash('$argon2id$v=19$m=65536$abc$def')).toBe(true);
    });

    it('is true for a record below the current cost', () => {
        expect(needsRehash(formatPbkdf2Record(100_000, 'abcd', 'ef01'))).toBe(true);
    });

    it('is false for a current record', () => {
        expect(needsRehash(formatPbkdf2Record(PBKDF2_ITERATIONS, 'abcd', 'ef01'))).toBe(false);
    });
});

describe('generateRecoveryCode', () => {
    it('uses only Crockford base32 symbols', () => {
        for (let i = 0; i < 50; i++) {
            const code = generateRecoveryCode();
            expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
            expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
            // Case-folding must not alter it, or verification would lose entropy.
            expect(code.toUpperCase()).toBe(code);
        }
    });

    it('does not repeat across a full batch', () => {
        const codes = Array.from({ length: RECOVERY_CODE_COUNT * 5 }, () => generateRecoveryCode());
        expect(new Set(codes).size).toBe(codes.length);
    });
});

describe('timingSafeEqualHex', () => {
    it('matches equal strings and rejects everything else', () => {
        expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
        expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
        expect(timingSafeEqualHex('abcd', 'abcdef')).toBe(false);
        expect(timingSafeEqualHex('', '')).toBe(true);
    });
});
