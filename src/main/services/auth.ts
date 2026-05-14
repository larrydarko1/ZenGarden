/**
 * auth — IPC handlers for authentication, user settings, and recovery codes.
 * Owns: register, login, logout, getCurrentUser, deleteAccount, updateUsername/Password/Theme/Language, recovery codes.
 * Does NOT own: data persistence helpers (db.ts), crypto (crypto.ts), data handlers (data.ts).
 */

import type { CollectionName, HandlerFn, RawDoc, Session, StoredUser } from './db';
import { readCollection, writeCollection, readSession, saveSession } from './db';
import {
    generateId,
    generateToken,
    hashPassword,
    hashPasswordPbkdf2,
    verifyPassword,
    generateRecoveryCodes,
    hashRecoveryCode,
    verifyRecoveryCode,
} from './crypto';

// ─── Session state ────────────────────────────────────────────────────────────

let currentSession: Session | null = readSession();

export function getCurrentSession(): Session | null {
    return currentSession;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const authHandlers: Record<string, HandlerFn> = {
    // ── Auth ─────────────────────────────────────────────────────────────

    ['storage:register']: async (_event, username, password, theme = 'dark', language = 'en') => {
        const trimmed = (username as string).trim();
        if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
            throw new Error('Username must be 3-32 alphanumeric characters');
        }

        const pw = password as string;
        if (!pw || pw.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const users = readCollection<StoredUser>('users');
        if (users.find((u) => u.username === trimmed)) {
            throw new Error('Username already exists');
        }

        const hashed = await hashPassword(pw);

        const newUser: StoredUser = {
            _id: generateId(),
            username: trimmed,
            ...(typeof hashed === 'string' ? { password: hashed } : { passwordHash: hashed.hash, salt: hashed.salt }),
            theme: theme as string,
            language: language as string,
            stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        writeCollection('users', users);

        const token = generateToken();
        currentSession = { username: trimmed, token };
        saveSession(currentSession);

        return { message: 'Registration successful', user: { username: trimmed, theme, language }, token };
    },

    ['storage:login']: async (_event, username, password) => {
        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === (username as string).trim());

        if (!user || !(await verifyPassword(password as string, user))) {
            throw new Error('Invalid username or password');
        }

        const token = generateToken();
        currentSession = { username: user.username, token };
        saveSession(currentSession);

        return {
            message: 'Login successful',
            user: { username: user.username, theme: user.theme ?? 'dark', language: user.language ?? 'en' },
            token,
        };
    },

    ['storage:getCurrentUser']: async () => {
        if (!currentSession) return null;

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) return null;

        return { username: user.username, theme: user.theme, language: user.language };
    },

    ['storage:logout']: async () => {
        currentSession = null;
        saveSession(null);
        return { message: 'Logged out successfully' };
    },

    ['storage:deleteAccount']: async (_event, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const idx = users.findIndex((u) => u.username === currentSession!.username);
        const user = users[idx];

        if (!(await verifyPassword(password as string, user))) {
            throw new Error('Invalid password');
        }

        const username = currentSession.username;
        users.splice(idx, 1);
        writeCollection('users', users);

        // Remove all records for this user across every collection
        (['meditations', 'emotionLogs', 'eightfoldPathLogs'] as CollectionName[]).forEach((col) => {
            const items = readCollection<RawDoc>(col);
            writeCollection(
                col,
                items.filter((item) => item['username'] !== username),
            );
        });

        currentSession = null;
        saveSession(null);
        return { message: 'Account deleted successfully' };
    },

    // ── Settings ─────────────────────────────────────────────────────────

    ['storage:updateUsername']: async (_event, newUsername, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        const trimmed = (newUsername as string).trim();
        if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
            throw new Error('Username must be 3-32 alphanumeric characters');
        }

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        if (!(await verifyPassword(password as string, user))) throw new Error('Invalid password');

        const oldUsername = currentSession.username;
        user.username = trimmed;
        writeCollection('users', users);

        // Propagate username rename to all related collections
        (['meditations', 'emotionLogs', 'eightfoldPathLogs'] as CollectionName[]).forEach((col) => {
            const items = readCollection<RawDoc>(col);
            items.forEach((item) => {
                if (item['username'] === oldUsername) item['username'] = trimmed;
            });
            writeCollection(col, items);
        });

        currentSession.username = trimmed;
        saveSession(currentSession);
        return { message: 'Username updated successfully' };
    },

    ['storage:updatePassword']: async (_event, currentPassword, newPassword) => {
        if (!currentSession) throw new Error('Not authenticated');

        const pw = newPassword as string;
        if (!pw || pw.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        if (!(await verifyPassword(currentPassword as string, user))) {
            throw new Error('Current password is incorrect');
        }

        const { hash, salt } = hashPasswordPbkdf2(pw);
        user.passwordHash = hash;
        user.salt = salt;
        // Clear any lingering Argon2 field so verify always uses PBKDF2 path after a password change
        delete user.password;
        writeCollection('users', users);
        return { message: 'Password updated successfully' };
    },

    ['storage:updateTheme']: async (_event, theme) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        user.theme = theme as string;
        writeCollection('users', users);
        return { message: 'Theme updated successfully' };
    },

    ['storage:updateLanguage']: async (_event, language) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        user.language = language as string;
        writeCollection('users', users);
        return { message: 'Language updated successfully' };
    },

    // ── Recovery codes ────────────────────────────────────────────────────

    ['storage:getRecoveryStatus']: async () => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        const codes = user.recoveryCodes ?? [];
        const usedCount = codes.filter((c) => c.used).length;

        return {
            hasRecoveryCodes: codes.length > 0,
            totalCodes: codes.length,
            usedCodes: usedCount,
            remainingCodes: codes.length - usedCount,
        };
    },

    ['storage:generateRecoveryCodes']: async (_event, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        if (!(await verifyPassword(password as string, user))) {
            throw new Error('Invalid password');
        }

        // Generate plaintext codes and store only their hashes
        const plaintextCodes = generateRecoveryCodes();
        user.recoveryCodes = plaintextCodes.map((code) => {
            const { hash, salt } = hashRecoveryCode(code);
            return { hash, salt, used: false };
        });

        writeCollection('users', users);

        // Return plaintext codes to display once — they are never stored
        return { codes: plaintextCodes };
    },

    ['storage:resetPasswordWithRecoveryCode']: async (_event, username, code, newPassword) => {
        const trimmed = (username as string).trim();
        const pw = newPassword as string;
        if (!pw || pw.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === trimmed);
        if (!user) throw new Error('Invalid username or recovery code');

        const codes = user.recoveryCodes ?? [];
        const matchIdx = codes.findIndex((c) => !c.used && verifyRecoveryCode(code as string, c.hash, c.salt));

        if (matchIdx === -1) throw new Error('Invalid username or recovery code');

        // Mark the code as used so it cannot be replayed
        codes[matchIdx].used = true;
        user.recoveryCodes = codes;

        // Update password to PBKDF2
        const { hash, salt } = hashPasswordPbkdf2(pw);
        user.passwordHash = hash;
        user.salt = salt;
        delete user.password;

        writeCollection('users', users);
        return { message: 'Password reset successfully' };
    },
};
