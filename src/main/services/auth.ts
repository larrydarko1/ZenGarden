/**
 * auth — IPC handlers for authentication, user settings, and recovery codes.
 * Owns: register, login, logout, getCurrentUser, deleteAccount, updateUsername/Password/Theme/Language, recovery codes.
 * Does NOT own: data persistence helpers (db.ts), crypto (crypto.ts), data handlers (data.ts).
 */

import type { IpcMain } from 'electron';
import {
    type IpcResult,
    LoginArgsSchema,
    PasswordArgSchema,
    LanguageArgSchema,
    RegisterArgsSchema,
    ResetPasswordArgsSchema,
    ThemeArgSchema,
    UpdatePasswordArgsSchema,
    UpdateUsernameArgsSchema,
} from '@/schemas/storage';
import {
    type CollectionName,
    type RawDoc,
    type Session,
    type StoredUser,
    readCollection,
    writeCollection,
    readSession,
    saveSession,
} from '@/main/services/db';
import {
    generateId,
    generateToken,
    hashSecret,
    rehashIfNeeded,
    setPassword,
    verifyPassword,
    generateRecoveryCodes,
    hashRecoveryCode,
    verifyRecoveryCode,
} from '@/main/services/crypto';

type Ack = { message: string };
type AuthResult = { message: string; user: { username: string; theme: string; language: string }; token: string };
type CurrentUser = { username: string; theme: string; language: string } | null;
type RecoveryStatusResult = {
    hasRecoveryCodes: boolean;
    totalCodes: number;
    usedCodes: number;
    remainingCodes: number;
};

let currentSession: Session | null = readSession();

export function register(ipc: IpcMain): void {
    ipc.handle(
        'storage:register',
        (_event, username: unknown, password: unknown, options: unknown): IpcResult<AuthResult> => {
            const parsed = RegisterArgsSchema.safeParse({ username, password, options });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
            const { username: trimmed, password: pw, options: prefs } = parsed.data;

            try {
                const users = readCollection<StoredUser>('users');
                if (users.find((u) => u.username === trimmed) !== undefined) {
                    throw new Error('Username already exists');
                }

                const newUser: StoredUser = {
                    _id: generateId(),
                    username: trimmed,
                    password: hashSecret(pw),
                    theme: prefs.theme,
                    language: prefs.language,
                    stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
                    createdAt: new Date().toISOString(),
                };

                users.push(newUser);
                writeCollection('users', users);

                const token = generateToken();
                currentSession = { username: trimmed, token };
                saveSession(currentSession);

                return {
                    success: true,
                    data: {
                        message: 'Registration successful',
                        user: { username: trimmed, theme: newUser.theme, language: newUser.language },
                        token,
                    },
                };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle(
        'storage:login',
        async (_event, username: unknown, password: unknown): Promise<IpcResult<AuthResult>> => {
            const parsed = LoginArgsSchema.safeParse({ username, password });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

            try {
                const users = readCollection<StoredUser>('users');
                const user = users.find((u) => u.username === parsed.data.username);

                if (user === undefined || !(await verifyPassword(parsed.data.password, user))) {
                    throw new Error('Invalid username or password');
                }

                // The one moment the plaintext exists to re-derive from.
                if (rehashIfNeeded(user, parsed.data.password)) writeCollection('users', users);

                const token = generateToken();
                currentSession = { username: user.username, token };
                saveSession(currentSession);

                return {
                    success: true,
                    data: {
                        message: 'Login successful',
                        user: { username: user.username, theme: user.theme ?? 'dark', language: user.language ?? 'en' },
                        token,
                    },
                };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle('storage:getCurrentUser', (): IpcResult<CurrentUser> => {
        try {
            if (currentSession === null) return { success: true, data: null };
            const session = currentSession;

            const users = readCollection<StoredUser>('users');
            const user = users.find((u) => u.username === session.username);
            if (user === undefined) return { success: true, data: null };

            return { success: true, data: { username: user.username, theme: user.theme, language: user.language } };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:logout', (): IpcResult<Ack> => {
        try {
            currentSession = null;
            saveSession(null);
            return { success: true, data: { message: 'Logged out successfully' } };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:deleteAccount', async (_event, password: unknown): Promise<IpcResult<Ack>> => {
        const parsed = PasswordArgSchema.safeParse({ password });
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

        try {
            if (currentSession === null) throw new Error('Not authenticated');
            const session = currentSession;

            const users = readCollection<StoredUser>('users');
            const idx = users.findIndex((u) => u.username === session.username);
            if (idx === -1) throw new Error('User not found');
            const user = users[idx];

            if (!(await verifyPassword(parsed.data.password, user))) {
                throw new Error('Invalid password');
            }

            const username = session.username;
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
            return { success: true, data: { message: 'Account deleted successfully' } };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle(
        'storage:updateUsername',
        async (_event, newUsername: unknown, password: unknown): Promise<IpcResult<Ack>> => {
            const parsed = UpdateUsernameArgsSchema.safeParse({ newUsername, password });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
            const trimmed = parsed.data.newUsername;

            try {
                if (currentSession === null) throw new Error('Not authenticated');
                const session = currentSession;

                const users = readCollection<StoredUser>('users');
                const user = users.find((u) => u.username === session.username);
                if (user === undefined) throw new Error('User not found');

                if (!(await verifyPassword(parsed.data.password, user))) {
                    throw new Error('Invalid password');
                }

                if (users.some((u) => u !== user && u.username === trimmed)) {
                    throw new Error('Username already exists');
                }

                const oldUsername = session.username;
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

                session.username = trimmed;
                saveSession(session);
                return { success: true, data: { message: 'Username updated successfully' } };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle(
        'storage:updatePassword',
        async (_event, currentPassword: unknown, newPassword: unknown): Promise<IpcResult<Ack>> => {
            const parsed = UpdatePasswordArgsSchema.safeParse({ currentPassword, newPassword });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
            const pw = parsed.data.newPassword;

            try {
                if (currentSession === null) throw new Error('Not authenticated');
                const session = currentSession;

                const users = readCollection<StoredUser>('users');
                const user = users.find((u) => u.username === session.username);
                if (user === undefined) throw new Error('User not found');

                if (!(await verifyPassword(parsed.data.currentPassword, user))) {
                    throw new Error('Current password is incorrect');
                }

                setPassword(user, pw);
                writeCollection('users', users);
                return { success: true, data: { message: 'Password updated successfully' } };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle('storage:updateTheme', (_event, theme: unknown): IpcResult<Ack> => {
        const parsed = ThemeArgSchema.safeParse({ theme });
        if (!parsed.success) return { success: false, error: 'Unknown theme' };

        try {
            if (currentSession === null) throw new Error('Not authenticated');
            const session = currentSession;

            const users = readCollection<StoredUser>('users');
            const user = users.find((u) => u.username === session.username);
            if (user === undefined) throw new Error('User not found');

            user.theme = parsed.data.theme;
            writeCollection('users', users);
            return { success: true, data: { message: 'Theme updated successfully' } };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:updateLanguage', (_event, language: unknown): IpcResult<Ack> => {
        const parsed = LanguageArgSchema.safeParse({ language });
        if (!parsed.success) return { success: false, error: 'Unknown language' };

        try {
            if (currentSession === null) throw new Error('Not authenticated');
            const session = currentSession;

            const users = readCollection<StoredUser>('users');
            const user = users.find((u) => u.username === session.username);
            if (user === undefined) throw new Error('User not found');

            user.language = parsed.data.language;
            writeCollection('users', users);
            return { success: true, data: { message: 'Language updated successfully' } };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle('storage:getRecoveryStatus', (): IpcResult<RecoveryStatusResult> => {
        try {
            if (currentSession === null) throw new Error('Not authenticated');
            const session = currentSession;

            const users = readCollection<StoredUser>('users');
            const user = users.find((u) => u.username === session.username);
            if (user === undefined) throw new Error('User not found');

            const codes = user.recoveryCodes ?? [];
            const usedCount = codes.filter((c) => c.used).length;

            return {
                success: true,
                data: {
                    hasRecoveryCodes: codes.length > 0,
                    totalCodes: codes.length,
                    usedCodes: usedCount,
                    remainingCodes: codes.length - usedCount,
                },
            };
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
    });

    ipc.handle(
        'storage:generateRecoveryCodes',
        async (_event, password: unknown): Promise<IpcResult<{ codes: string[] }>> => {
            const parsed = PasswordArgSchema.safeParse({ password });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

            try {
                if (currentSession === null) throw new Error('Not authenticated');
                const session = currentSession;

                const users = readCollection<StoredUser>('users');
                const user = users.find((u) => u.username === session.username);
                if (user === undefined) throw new Error('User not found');

                if (!(await verifyPassword(parsed.data.password, user))) {
                    throw new Error('Invalid password');
                }

                // Generate plaintext codes and store only their hashes
                const plaintextCodes = generateRecoveryCodes();
                user.recoveryCodes = plaintextCodes.map(hashRecoveryCode);

                writeCollection('users', users);

                // Return plaintext codes to display once — they are never stored
                return { success: true, data: { codes: plaintextCodes } };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );

    ipc.handle(
        'storage:resetPasswordWithRecoveryCode',
        (_event, username: unknown, code: unknown, newPassword: unknown): IpcResult<Ack> => {
            const parsed = ResetPasswordArgsSchema.safeParse({ username, code, newPassword });
            if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
            const { username: trimmed, code: recoveryCode, newPassword: pw } = parsed.data;

            try {
                const users = readCollection<StoredUser>('users');
                const user = users.find((u) => u.username === trimmed);
                if (user === undefined) throw new Error('Invalid username or recovery code');

                const codes = user.recoveryCodes ?? [];
                const matchIdx = codes.findIndex((c) => !c.used && verifyRecoveryCode(recoveryCode, c.hash, c.salt));

                if (matchIdx === -1) throw new Error('Invalid username or recovery code');

                // Mark the code as used so it cannot be replayed
                codes[matchIdx].used = true;
                user.recoveryCodes = codes;

                setPassword(user, pw);

                writeCollection('users', users);
                return { success: true, data: { message: 'Password reset successfully' } };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );
}

export function findCurrentSession(): Session | null {
    return currentSession;
}
