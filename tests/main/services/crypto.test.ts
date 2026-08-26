import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import {
    generateId,
    generateToken,
    hashSecret,
    setPassword,
    rehashIfNeeded,
    verifyPassword,
    generateRecoveryCodes,
    hashRecoveryCode,
    verifyRecoveryCode,
} from '@/main/services/crypto';

describe('generateId', () => {
    it('returns a non-empty string', () => {
        expect(generateId()).toBeTruthy();
    });

    it('returns unique values on successive calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });
});

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

describe('hashSecret', () => {
    it('produces a record in the shared format', () => {
        expect(hashSecret('test-password')).toMatch(/^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    });

    it('salts every call separately', () => {
        expect(hashSecret('pw')).not.toBe(hashSecret('pw'));
    });
});

function userWith(fields: Record<string, unknown>) {
    return {
        _id: '1',
        username: 'u',
        theme: 'dark',
        language: 'en',
        stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
        createdAt: '',
        ...fields,
    };
}

describe('verifyPassword', () => {
    it('returns true for a correct password', async () => {
        expect(await verifyPassword('my-secret', userWith({ password: hashSecret('my-secret') }))).toBe(true);
    });

    it('returns false for an incorrect password', async () => {
        expect(await verifyPassword('wrong-password', userWith({ password: hashSecret('my-secret') }))).toBe(false);
    });

    it('returns false when user has no password fields', async () => {
        expect(await verifyPassword('anything', userWith({}))).toBe(false);
    });

    // Every desktop account created before this change holds an Argon2 record.
    // Dropping the argon2 dependency would lock all of them out, so it stays as a
    // verify-only path until enough releases have passed for logins to migrate.
    it('still accepts a legacy argon2 record', async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const argon2 = require('argon2') as { hash: (p: string) => Promise<string> };
        const user = userWith({ password: await argon2.hash('argon-pw') });

        expect(user.password).toMatch(/^\$argon2/);
        expect(await verifyPassword('argon-pw', user)).toBe(true);
        expect(await verifyPassword('nope', user)).toBe(false);
    });

    // Records written before the formats were unified: PBKDF2 split across
    // passwordHash + salt at 100k iterations. Their owners must still get in.
    it('still accepts a legacy split record', async () => {
        const legacy = userWith({
            passwordHash: crypto.pbkdf2Sync('legacy-pw', 'deadbeef', 100_000, 64, 'sha256').toString('hex'),
            salt: 'deadbeef',
        });
        expect(await verifyPassword('legacy-pw', legacy)).toBe(true);
        expect(await verifyPassword('nope', legacy)).toBe(false);
    });
});

describe('setPassword', () => {
    it('clears the legacy split fields it replaces', () => {
        const user = userWith({ passwordHash: 'old', salt: 'oldsalt' });
        setPassword(user, 'new-password');
        expect(user.passwordHash).toBeUndefined();
        expect(user.salt).toBeUndefined();
        expect(user.password).toMatch(/^pbkdf2\$/);
    });
});

describe('rehashIfNeeded', () => {
    it('migrates a legacy split record and reports it changed', () => {
        const user = userWith({
            passwordHash: crypto.pbkdf2Sync('pw', 'abcd', 100_000, 64, 'sha256').toString('hex'),
            salt: 'abcd',
        });
        expect(rehashIfNeeded(user, 'pw')).toBe(true);
        expect(user.password).toMatch(/^pbkdf2\$600000\$/);
        expect(user.passwordHash).toBeUndefined();
    });

    it('leaves a current record alone', () => {
        const user = userWith({ password: hashSecret('pw') });
        const before = user.password;
        expect(rehashIfNeeded(user, 'pw')).toBe(false);
        expect(user.password).toBe(before);
    });

    // An old record raises the cost the next time its owner logs in.
    it('migrates a record below the current iteration count', () => {
        const user = userWith({ password: 'pbkdf2$100000$abcd$0011' });
        expect(rehashIfNeeded(user, 'pw')).toBe(true);
        expect(user.password).toMatch(/^pbkdf2\$600000\$/);
    });
});

describe('generateRecoveryCodes', () => {
    it('returns exactly 10 codes', () => {
        const codes = generateRecoveryCodes();
        expect(codes).toHaveLength(10);
    });

    it('returns 10-character Crockford base32 codes', () => {
        const codes = generateRecoveryCodes();
        codes.forEach((code) => {
            expect(code).toHaveLength(10);
            expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
        });
    });

    it('emits no character that case-folding would alter', () => {
        generateRecoveryCodes().forEach((code) => {
            expect(code.toUpperCase()).toBe(code);
        });
    });

    it('does not repeat codes across calls', () => {
        const codes = [...generateRecoveryCodes(), ...generateRecoveryCodes()];
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('returns unique codes within a set', () => {
        const codes = generateRecoveryCodes();
        expect(new Set(codes).size).toBe(10);
    });

    it('returns different sets on successive calls', () => {
        const a = generateRecoveryCodes();
        const b = generateRecoveryCodes();
        expect(a).not.toEqual(b);
    });
});

describe('hashRecoveryCode', () => {
    it('returns a stored record with an empty salt', () => {
        const record = hashRecoveryCode('TESTCODE');
        expect(record.hash).toMatch(/^pbkdf2\$600000\$/);
        expect(record.salt).toBe('');
        expect(record.used).toBe(false);
    });

    it('is case-insensitive', () => {
        const { hash } = hashRecoveryCode('testcode');
        expect(verifyRecoveryCode('TESTCODE', hash, '')).toBe(true);
    });
});

describe('verifyRecoveryCode', () => {
    it('returns true for a matching code', () => {
        const code = 'TESTCODE';
        const { hash, salt } = hashRecoveryCode(code);
        expect(verifyRecoveryCode(code, hash, salt)).toBe(true);
    });

    it('is case-insensitive', () => {
        const { hash, salt } = hashRecoveryCode('TESTCODE');
        expect(verifyRecoveryCode('testcode', hash, salt)).toBe(true);
    });

    it('returns false for a wrong code', () => {
        const { hash, salt } = hashRecoveryCode('TESTCODE');
        expect(verifyRecoveryCode('WRONGONE', hash, salt)).toBe(false);
    });

    it('returns false for a truncated stored hash instead of throwing', () => {
        const { hash, salt } = hashRecoveryCode('TESTCODE');
        expect(() => verifyRecoveryCode('TESTCODE', hash.slice(0, 32), salt)).not.toThrow();
        expect(verifyRecoveryCode('TESTCODE', hash.slice(0, 32), salt)).toBe(false);
    });

    it('returns false with a mismatched salt', () => {
        const { hash } = hashRecoveryCode('TESTCODE');
        expect(verifyRecoveryCode('TESTCODE', hash, 'wrong-salt')).toBe(false);
    });
});
