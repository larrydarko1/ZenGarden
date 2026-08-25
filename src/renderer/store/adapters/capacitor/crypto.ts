/**
 * Capacitor Crypto - Password hashing and verification via Web Crypto API.
 * Owns: PBKDF2 hashing, legacy SHA-256 verification, hash upgrade logic.
 */
import { writeCollection } from '@/renderer/store/adapters/capacitor/db';
import type { User } from '@/renderer/store/types';

export type UserWithPassword = {
    _id: string;
    password: string;
} & User;

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2:';

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
        'deriveBits',
    ]);
    const derived = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        key,
        512,
    );
    return `${PBKDF2_PREFIX}${hexEncode(salt.buffer)}:${hexEncode(derived)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith(PBKDF2_PREFIX)) {
        const parts = storedHash.slice(PBKDF2_PREFIX.length).split(':');
        if (parts.length !== 2) return false;
        const saltHex = parts[0];
        const expectedHash = parts[1];
        const saltBytes = saltHex.match(/.{2}/g) ?? [];
        const salt = new Uint8Array(saltBytes.map((byte) => parseInt(byte, 16)));
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
            'deriveBits',
        ]);
        const derived = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
            key,
            512,
        );
        return hexEncode(derived) === expectedHash;
    }

    // Legacy SHA-256 path — kept for backward compatibility with existing users
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return hexEncode(hashBuffer) === storedHash;
}

export async function upgradeHashIfNeeded(
    users: UserWithPassword[],
    userIndex: number,
    password: string,
    usersFilename: string,
): Promise<void> {
    if (!users[userIndex].password.startsWith(PBKDF2_PREFIX)) {
        users[userIndex].password = await hashPassword(password);
        await writeCollection(usersFilename, users);
    }
}

function hexEncode(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
