/**
 * Capacitor Crypto - Password hashing and verification via the Web Crypto API.
 * Owns: PBKDF2 derivation on Android, password verification, legacy hash upgrade.
 * Does NOT own: the record format shared with the desktop (@/schemas/password),
 * file I/O (capacitor/db.ts).
 */
import {
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_BYTES,
    PBKDF2_SALT_BYTES,
    formatPbkdf2Record,
    fromHex,
    needsRehash,
    parsePbkdf2Record,
    timingSafeEqualHex,
    toHex,
} from '@/schemas/password';
import { writeCollection } from '@/renderer/store/adapters/capacitor/db';
import type { User } from '@/renderer/store/types';

export type UserWithPassword = {
    _id: string;
    password: string;
} & User;

/** The pre-unification mobile format: `pbkdf2:<saltHex>:<hashHex>`, always 100k iterations. */
const LEGACY_PREFIX = 'pbkdf2:';

const LEGACY_ITERATIONS = 100_000;

/** Derives a record in the shared format. The salt is new on every call. */
export async function hashPassword(password: string): Promise<string> {
    const salt = new Uint8Array(PBKDF2_SALT_BYTES);
    crypto.getRandomValues(salt);
    const saltHex = toHex(salt);
    return formatPbkdf2Record(PBKDF2_ITERATIONS, saltHex, await derive(password, saltHex, PBKDF2_ITERATIONS));
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (typeof storedHash !== 'string' || storedHash === '') return false;

    const parsed = parsePbkdf2Record(storedHash);
    if (parsed !== null) {
        return timingSafeEqualHex(await derive(password, parsed.saltHex, parsed.iterations), parsed.hashHex);
    }

    if (storedHash.startsWith(LEGACY_PREFIX)) {
        const parts = storedHash.slice(LEGACY_PREFIX.length).split(':');
        if (parts.length !== 2) return false;
        return timingSafeEqualHex(await derive(password, parts[0], LEGACY_ITERATIONS), parts[1]);
    }

    // Legacy: unsalted SHA-256, from builds before PBKDF2.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return timingSafeEqualHex(toHex(new Uint8Array(digest)), storedHash);
}

/**
 * Rewrites a legacy or under-cost record on the next successful login, which is
 * the only moment the plaintext is available to re-derive from.
 */
export async function upgradeHashIfNeeded(
    users: UserWithPassword[],
    userIndex: number,
    password: string,
    usersFilename: string,
): Promise<void> {
    if (!needsRehash(users[userIndex].password)) return;
    users[userIndex].password = await hashPassword(password);
    await writeCollection(usersFilename, users);
}

async function derive(secret: string, saltHex: string, iterations: number): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' },
        key,
        PBKDF2_KEY_BYTES * 8,
    );
    return toHex(new Uint8Array(bits));
}
