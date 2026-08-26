import { vi, describe, it, expect, beforeEach } from 'vitest';
import { register as registerAuthHandlers, findCurrentSession } from '@/main/services/auth';

import type { IpcResult } from '@/schemas/storage';

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown;

const state = vi.hoisted(() => ({
    collections: {} as Record<string, unknown[]>,
    savedSession: null as { username: string; token: string } | null,
}));

// Stub event object for handler calls
const event = {} as Electron.IpcMainInvokeEvent;

vi.mock('electron', () => ({
    app: { getPath: () => '/tmp/zengarden-test' },
}));

vi.mock('fs', () => ({
    default: {
        existsSync: () => true,
        readFileSync: () => '[]',
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: () => true,
    readFileSync: () => '[]',
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

vi.mock('@/main/services/db', () => ({
    readCollection: (name: string) => state.collections[name] ?? [],
    writeCollection: (name: string, data: unknown[]) => {
        state.collections[name] = data;
    },
    readSession: () => state.savedSession,
    saveSession: (s: { username: string; token: string } | null) => {
        state.savedSession = s;
    },
}));

function makeMockIpc() {
    const handlers = new Map<string, IpcHandler>();
    return {
        handle(channel: string, fn: IpcHandler) {
            handlers.set(channel, fn);
        },
        async invoke(channel: string, ...args: unknown[]) {
            const fn = handlers.get(channel);
            if (fn === undefined) throw new Error(`No handler registered for channel '${channel}'`);
            const result = (await fn(event, ...args)) as IpcResult<unknown>;
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
    };
}

const ipc = makeMockIpc();
registerAuthHandlers(ipc as unknown as Electron.IpcMain);

function resetState(): void {
    state.collections = { users: [], meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
    state.savedSession = null;
}

async function registerUser(
    username = 'testuser',
    password = 'password123',
): Promise<{ user: { username: string }; token: string }> {
    return ipc.invoke('storage:register', username, password) as Promise<{
        user: { username: string };
        token: string;
    }>;
}

describe('storage:register', () => {
    beforeEach(resetState);

    it('registers a new user and returns user + token', async () => {
        const res = await registerUser();
        expect(res.user.username).toBe('testuser');
        expect(res.token).toBeTruthy();
    });

    it('persists the user to the users collection', async () => {
        await registerUser();
        expect(state.collections['users']).toHaveLength(1);
    });

    it('saves a session after registration', async () => {
        await registerUser();
        expect(state.savedSession).not.toBeNull();
        expect(state.savedSession!.username).toBe('testuser');
    });

    it('rejects duplicate usernames', async () => {
        await registerUser('alice');
        await expect(registerUser('alice')).rejects.toThrow('Username already exists');
    });

    it('rejects short usernames', async () => {
        await expect(registerUser('ab')).rejects.toThrow('Username must be 3-32 alphanumeric characters');
    });

    it('rejects non-alphanumeric usernames', async () => {
        await expect(registerUser('user@name')).rejects.toThrow('Username must be 3-32 alphanumeric characters');
    });

    it('rejects short passwords', async () => {
        await expect(registerUser('validuser', 'short')).rejects.toThrow('Password must be at least 8 characters');
    });

    it('trims leading/trailing spaces from usernames', async () => {
        const res = await registerUser('  padded  ');
        expect(res.user.username).toBe('padded');
    });
});

describe('storage:login', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('logs in with correct credentials', async () => {
        state.savedSession = null;
        const res = (await ipc.invoke('storage:login', 'testuser', 'password123')) as {
            user: { username: string };
            token: string;
        };
        expect(res.user.username).toBe('testuser');
        expect(res.token).toBeTruthy();
    });

    it('rejects incorrect password', async () => {
        await expect(ipc.invoke('storage:login', 'testuser', 'wrongpassword')).rejects.toThrow(
            'Invalid username or password',
        );
    });

    // The journey every existing desktop account takes: an Argon2 record from an
    // older build logs in once, and comes out the far side in the shared format
    // that Android can also read.
    it('migrates a legacy argon2 record on login', async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const argon2 = require('argon2') as { hash: (p: string) => Promise<string> };
        state.collections['users'] = [
            {
                _id: 'legacy',
                username: 'oldtimer',
                password: await argon2.hash('password123'),
                theme: 'dark',
                language: 'en',
                stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
                createdAt: '',
            },
        ];
        state.savedSession = null;

        await ipc.invoke('storage:login', 'oldtimer', 'password123');

        const user = state.collections['users'][0] as Record<string, unknown>;
        expect(user['password']).toMatch(/^pbkdf2\$600000\$/);
    });

    it('still logs the migrated account in afterwards', async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const argon2 = require('argon2') as { hash: (p: string) => Promise<string> };
        state.collections['users'] = [
            {
                _id: 'legacy',
                username: 'oldtimer',
                password: await argon2.hash('password123'),
                theme: 'dark',
                language: 'en',
                stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
                createdAt: '',
            },
        ];

        await ipc.invoke('storage:login', 'oldtimer', 'password123');
        state.savedSession = null;
        const res = (await ipc.invoke('storage:login', 'oldtimer', 'password123')) as { token: string };

        expect(res.token).toBeTruthy();
    });

    it('rejects non-existent username', async () => {
        await expect(ipc.invoke('storage:login', 'ghost', 'password123')).rejects.toThrow(
            'Invalid username or password',
        );
    });
});

describe('storage:getCurrentUser', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns user info when session exists', async () => {
        const res = (await ipc.invoke('storage:getCurrentUser')) as { username: string };
        expect(res.username).toBe('testuser');
    });

    it('returns null when no session', async () => {
        await ipc.invoke('storage:logout');
        const res = await ipc.invoke('storage:getCurrentUser');
        expect(res).toBeNull();
    });
});

describe('storage:logout', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('clears the session', async () => {
        await ipc.invoke('storage:logout');
        expect(state.savedSession).toBeNull();
        expect(findCurrentSession()).toBeNull();
    });
});

describe('storage:deleteAccount', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
        state.collections['meditations'] = [{ _id: '1', username: 'testuser', date: '2025-01-01' }];
        state.collections['emotionLogs'] = [{ _id: '2', username: 'testuser', date: '2025-01-01' }];
    });

    it('deletes account with correct password', async () => {
        await ipc.invoke('storage:deleteAccount', 'password123');
        expect(state.collections['users']).toHaveLength(0);
    });

    it('removes associated data from all collections', async () => {
        await ipc.invoke('storage:deleteAccount', 'password123');
        expect(state.collections['meditations']).toHaveLength(0);
        expect(state.collections['emotionLogs']).toHaveLength(0);
    });

    it('clears the session after deletion', async () => {
        await ipc.invoke('storage:deleteAccount', 'password123');
        expect(state.savedSession).toBeNull();
    });

    it('rejects with wrong password', async () => {
        await expect(ipc.invoke('storage:deleteAccount', 'wrongpass')).rejects.toThrow('Invalid password');
    });

    it('reports a missing user rather than an internal error', async () => {
        state.collections['users'] = [];
        await expect(ipc.invoke('storage:deleteAccount', 'password123')).rejects.toThrow('User not found');
    });
});

describe('storage:updateUsername', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
        state.collections['meditations'] = [{ _id: '1', username: 'testuser' }];
    });

    it('updates username with correct password', async () => {
        await ipc.invoke('storage:updateUsername', 'newname', 'password123');
        const user = state.collections['users'][0] as { username: string };
        expect(user.username).toBe('newname');
    });

    it('propagates the rename to data collections', async () => {
        await ipc.invoke('storage:updateUsername', 'newname', 'password123');
        const med = state.collections['meditations'][0] as { username: string };
        expect(med.username).toBe('newname');
    });

    it('rejects with wrong password', async () => {
        await expect(ipc.invoke('storage:updateUsername', 'newname', 'wrongpass')).rejects.toThrow('Invalid password');
    });

    it('rejects invalid new username', async () => {
        await expect(ipc.invoke('storage:updateUsername', 'ab', 'password123')).rejects.toThrow(
            'Username must be 3-32 alphanumeric characters',
        );
    });

    it('rejects a rename onto a username that already exists', async () => {
        state.collections['users'].push({ _id: 'other', username: 'taken', stats: {} });
        await expect(ipc.invoke('storage:updateUsername', 'taken', 'password123')).rejects.toThrow(
            'Username already exists',
        );
    });

    it('leaves the username unchanged when the rename is rejected', async () => {
        state.collections['users'].push({ _id: 'other', username: 'taken', stats: {} });
        await expect(ipc.invoke('storage:updateUsername', 'taken', 'password123')).rejects.toThrow();
        const user = state.collections['users'][0] as { username: string };
        expect(user.username).toBe('testuser');
    });

    it('allows a rename to the name the account already has', async () => {
        await ipc.invoke('storage:updateUsername', 'testuser', 'password123');
        const user = state.collections['users'][0] as { username: string };
        expect(user.username).toBe('testuser');
    });
});

describe('storage:updatePassword', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates password with correct current password', async () => {
        await ipc.invoke('storage:updatePassword', 'password123', 'newpassword456');
        state.savedSession = null;
        const res = (await ipc.invoke('storage:login', 'testuser', 'newpassword456')) as {
            token: string;
        };
        expect(res.token).toBeTruthy();
    });

    it('rejects with wrong current password', async () => {
        await expect(ipc.invoke('storage:updatePassword', 'wrongpass', 'newpass12')).rejects.toThrow(
            'Current password is incorrect',
        );
    });

    it('rejects short new password', async () => {
        await expect(ipc.invoke('storage:updatePassword', 'password123', 'short')).rejects.toThrow(
            'Password must be at least 8 characters',
        );
    });

    it('does not weaken the stored hash', async () => {
        const before = { ...(state.collections['users'][0] as Record<string, unknown>) };
        await ipc.invoke('storage:updatePassword', 'password123', 'newpassword456');
        const after = state.collections['users'][0] as Record<string, unknown>;

        const wasArgon2 = typeof before['password'] === 'string';
        expect(typeof after['password'] === 'string').toBe(wasArgon2);
    });

    it("clears the previous scheme's fields", async () => {
        await ipc.invoke('storage:updatePassword', 'password123', 'newpassword456');
        const user = state.collections['users'][0] as Record<string, unknown>;

        if (typeof user['password'] === 'string') {
            expect(user['passwordHash']).toBeUndefined();
            expect(user['salt']).toBeUndefined();
        } else {
            expect(user['password']).toBeUndefined();
        }
    });

    it('stops accepting the old password', async () => {
        await ipc.invoke('storage:updatePassword', 'password123', 'newpassword456');
        state.savedSession = null;
        await expect(ipc.invoke('storage:login', 'testuser', 'password123')).rejects.toThrow(
            'Invalid username or password',
        );
    });
});

describe('storage:updateTheme', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates the theme', async () => {
        await ipc.invoke('storage:updateTheme', 'light');
        const user = state.collections['users'][0] as { theme: string };
        expect(user.theme).toBe('light');
    });

    it('rejects when not authenticated', async () => {
        await ipc.invoke('storage:logout');
        await expect(ipc.invoke('storage:updateTheme', 'light')).rejects.toThrow('Not authenticated');
    });
});

describe('storage:updateLanguage', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates the language', async () => {
        await ipc.invoke('storage:updateLanguage', 'ja');
        const user = state.collections['users'][0] as { language: string };
        expect(user.language).toBe('ja');
    });
});

describe('storage:getRecoveryStatus', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns no codes when none have been generated', async () => {
        const status = (await ipc.invoke('storage:getRecoveryStatus')) as {
            hasRecoveryCodes: boolean;
            totalCodes: number;
        };
        expect(status.hasRecoveryCodes).toBe(false);
        expect(status.totalCodes).toBe(0);
    });

    it('rejects when not authenticated', async () => {
        await ipc.invoke('storage:logout');
        await expect(ipc.invoke('storage:getRecoveryStatus')).rejects.toThrow('Not authenticated');
    });
});

describe('storage:generateRecoveryCodes', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns 10 plaintext codes', async () => {
        const res = (await ipc.invoke('storage:generateRecoveryCodes', 'password123')) as {
            codes: string[];
        };
        expect(res.codes).toHaveLength(10);
    });

    it('stores hashed codes on the user record', async () => {
        await ipc.invoke('storage:generateRecoveryCodes', 'password123');
        const user = state.collections['users'][0] as {
            recoveryCodes: { hash: string; salt: string; used: boolean }[];
        };
        expect(user.recoveryCodes).toHaveLength(10);
        user.recoveryCodes.forEach((c) => {
            // The record string carries its own salt, so the field stays empty.
            expect(c.hash).toMatch(/^pbkdf2\$600000\$/);
            expect(c.salt).toBe('');
            expect(c.used).toBe(false);
        });
    });

    it('updates recovery status after generation', async () => {
        await ipc.invoke('storage:generateRecoveryCodes', 'password123');
        const status = (await ipc.invoke('storage:getRecoveryStatus')) as {
            hasRecoveryCodes: boolean;
            remainingCodes: number;
        };
        expect(status.hasRecoveryCodes).toBe(true);
        expect(status.remainingCodes).toBe(10);
    });

    it('rejects with wrong password', async () => {
        await expect(ipc.invoke('storage:generateRecoveryCodes', 'wrongpass')).rejects.toThrow('Invalid password');
    });
});

describe('storage:resetPasswordWithRecoveryCode', () => {
    let codes: string[] = [];

    beforeEach(async () => {
        resetState();
        await registerUser();
        const res = (await ipc.invoke('storage:generateRecoveryCodes', 'password123')) as {
            codes: string[];
        };
        codes = res.codes;
    });

    it('resets password with a valid recovery code', async () => {
        await ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', codes[0], 'brandnewpass');
        state.savedSession = null;
        const res = (await ipc.invoke('storage:login', 'testuser', 'brandnewpass')) as {
            token: string;
        };
        expect(res.token).toBeTruthy();
    });

    it('marks the recovery code as used', async () => {
        await ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', codes[0], 'newpass12345');
        const user = state.collections['users'][0] as {
            recoveryCodes: { used: boolean }[];
        };
        expect(user.recoveryCodes[0].used).toBe(true);
    });

    it('rejects a used code on second attempt', async () => {
        await ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', codes[0], 'newpass12345');
        await expect(
            ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', codes[0], 'anotherpass1'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects an invalid code', async () => {
        await expect(
            ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', 'INVALID1', 'newpass12345'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects a non-existent username', async () => {
        await expect(
            ipc.invoke('storage:resetPasswordWithRecoveryCode', 'ghost', codes[0], 'newpass12345'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects short new password', async () => {
        await expect(
            ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', codes[0], 'short'),
        ).rejects.toThrow('Password must be at least 8 characters');
    });
});

describe('argument validation at the IPC boundary', () => {
    beforeEach(resetState);

    it('rejects a non-string username without reading the user file', async () => {
        await expect(ipc.invoke('storage:register', 42, 'password123')).rejects.toThrow(
            'Username must be 3-32 alphanumeric characters',
        );
        expect(state.collections['users'] ?? []).toHaveLength(0);
    });

    it('trims a username before storing it', async () => {
        const result = await registerUser('  spacey  ');
        expect(result.user.username).toBe('spacey');
    });

    it('falls back to defaults when registration preferences are unusable', async () => {
        const result = (await ipc.invoke('storage:register', 'prefsuser', 'password123', {
            theme: 'neon',
            language: 'klingon',
        })) as { user: { theme: string; language: string } };

        expect(result.user.theme).toBe('dark');
        expect(result.user.language).toBe('en');
    });

    it('keeps registration preferences that are valid', async () => {
        const result = (await ipc.invoke('storage:register', 'prefsuser', 'password123', {
            theme: 'light',
            language: 'ja',
        })) as { user: { theme: string; language: string } };

        expect(result.user.theme).toBe('light');
        expect(result.user.language).toBe('ja');
    });

    it('gives a malformed login the same answer as a wrong password', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:login', null, 'password123')).rejects.toThrow('Invalid username or password');
        await expect(ipc.invoke('storage:login', 'ab', 'password123')).rejects.toThrow('Invalid username or password');
    });

    it('rejects an unknown theme', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:updateTheme', 'neon')).rejects.toThrow('Unknown theme');
    });

    it('rejects an unknown language', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:updateLanguage', 'klingon')).rejects.toThrow('Unknown language');
    });

    it('rejects a non-string password on delete without touching the account', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:deleteAccount', { toString: () => 'x' })).rejects.toThrow('Invalid password');
        expect(state.collections['users']).toHaveLength(1);
    });

    it('rejects a non-string new username', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:updateUsername', 12345, 'password123')).rejects.toThrow(
            'Username must be 3-32 alphanumeric characters',
        );
    });

    it('rejects a non-string current password', async () => {
        await registerUser();
        await expect(ipc.invoke('storage:updatePassword', null, 'newpass12345')).rejects.toThrow(
            'Password must be a string',
        );
    });

    it('rejects a non-string recovery code', async () => {
        await registerUser();
        await expect(
            ipc.invoke('storage:resetPasswordWithRecoveryCode', 'testuser', 999, 'newpass12345'),
        ).rejects.toThrow('Invalid username or recovery code');
    });
});
