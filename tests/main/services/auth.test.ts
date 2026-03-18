// @vitest-environment node

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// vi.hoisted runs before vi.mock hoisting, so these are available inside mock factories
const state = vi.hoisted(() => ({
    collections: {} as Record<string, unknown[]>,
    savedSession: null as { username: string; token: string } | null,
}));

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

vi.mock('../../../src/main/services/db', () => ({
    readCollection: (name: string) => state.collections[name] ?? [],
    writeCollection: (name: string, data: unknown[]) => {
        state.collections[name] = data;
    },
    readSession: () => state.savedSession,
    saveSession: (s: { username: string; token: string } | null) => {
        state.savedSession = s;
    },
}));

// Stub event object for handler calls
const event = {} as Electron.IpcMainInvokeEvent;

import { authHandlers, getCurrentSession } from '../../../src/main/services/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetState(): void {
    state.collections = { users: [], meditations: [], emotionLogs: [], eightfoldPathLogs: [] };
    state.savedSession = null;
}

async function registerUser(
    username = 'testuser',
    password = 'password123',
): Promise<{ user: { username: string }; token: string }> {
    return authHandlers['storage:register'](event, username, password) as Promise<{
        user: { username: string };
        token: string;
    }>;
}

// ─── Registration ─────────────────────────────────────────────────────────────

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

// ─── Login ────────────────────────────────────────────────────────────────────

describe('storage:login', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('logs in with correct credentials', async () => {
        state.savedSession = null;
        const res = (await authHandlers['storage:login'](event, 'testuser', 'password123')) as {
            user: { username: string };
            token: string;
        };
        expect(res.user.username).toBe('testuser');
        expect(res.token).toBeTruthy();
    });

    it('rejects incorrect password', async () => {
        await expect(authHandlers['storage:login'](event, 'testuser', 'wrongpassword')).rejects.toThrow(
            'Invalid username or password',
        );
    });

    it('rejects non-existent username', async () => {
        await expect(authHandlers['storage:login'](event, 'ghost', 'password123')).rejects.toThrow(
            'Invalid username or password',
        );
    });
});

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('storage:getCurrentUser', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns user info when session exists', async () => {
        const res = (await authHandlers['storage:getCurrentUser'](event)) as { username: string };
        expect(res.username).toBe('testuser');
    });

    it('returns null when no session', async () => {
        await authHandlers['storage:logout'](event);
        const res = await authHandlers['storage:getCurrentUser'](event);
        expect(res).toBeNull();
    });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('storage:logout', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('clears the session', async () => {
        await authHandlers['storage:logout'](event);
        expect(state.savedSession).toBeNull();
        expect(getCurrentSession()).toBeNull();
    });
});

// ─── Delete account ───────────────────────────────────────────────────────────

describe('storage:deleteAccount', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
        // Add some associated data
        state.collections['meditations'] = [{ _id: '1', username: 'testuser', date: '2025-01-01' }];
        state.collections['emotionLogs'] = [{ _id: '2', username: 'testuser', date: '2025-01-01' }];
    });

    it('deletes account with correct password', async () => {
        await authHandlers['storage:deleteAccount'](event, 'password123');
        expect(state.collections['users']).toHaveLength(0);
    });

    it('removes associated data from all collections', async () => {
        await authHandlers['storage:deleteAccount'](event, 'password123');
        expect(state.collections['meditations']).toHaveLength(0);
        expect(state.collections['emotionLogs']).toHaveLength(0);
    });

    it('clears the session after deletion', async () => {
        await authHandlers['storage:deleteAccount'](event, 'password123');
        expect(state.savedSession).toBeNull();
    });

    it('rejects with wrong password', async () => {
        await expect(authHandlers['storage:deleteAccount'](event, 'wrongpass')).rejects.toThrow('Invalid password');
    });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('storage:updateUsername', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
        state.collections['meditations'] = [{ _id: '1', username: 'testuser' }];
    });

    it('updates username with correct password', async () => {
        await authHandlers['storage:updateUsername'](event, 'newname', 'password123');
        const user = state.collections['users'][0] as { username: string };
        expect(user.username).toBe('newname');
    });

    it('propagates the rename to data collections', async () => {
        await authHandlers['storage:updateUsername'](event, 'newname', 'password123');
        const med = state.collections['meditations'][0] as { username: string };
        expect(med.username).toBe('newname');
    });

    it('rejects with wrong password', async () => {
        await expect(authHandlers['storage:updateUsername'](event, 'newname', 'wrongpass')).rejects.toThrow(
            'Invalid password',
        );
    });

    it('rejects invalid new username', async () => {
        await expect(authHandlers['storage:updateUsername'](event, 'ab', 'password123')).rejects.toThrow(
            'Username must be 3-32 alphanumeric characters',
        );
    });
});

describe('storage:updatePassword', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates password with correct current password', async () => {
        await authHandlers['storage:updatePassword'](event, 'password123', 'newpassword456');
        // Verify we can now login with the new password
        state.savedSession = null;
        const res = (await authHandlers['storage:login'](event, 'testuser', 'newpassword456')) as {
            token: string;
        };
        expect(res.token).toBeTruthy();
    });

    it('rejects with wrong current password', async () => {
        await expect(authHandlers['storage:updatePassword'](event, 'wrongpass', 'newpass12')).rejects.toThrow(
            'Current password is incorrect',
        );
    });

    it('rejects short new password', async () => {
        await expect(authHandlers['storage:updatePassword'](event, 'password123', 'short')).rejects.toThrow(
            'Password must be at least 8 characters',
        );
    });
});

describe('storage:updateTheme', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates the theme', async () => {
        await authHandlers['storage:updateTheme'](event, 'light');
        const user = state.collections['users'][0] as { theme: string };
        expect(user.theme).toBe('light');
    });

    it('rejects when not authenticated', async () => {
        await authHandlers['storage:logout'](event);
        await expect(authHandlers['storage:updateTheme'](event, 'light')).rejects.toThrow('Not authenticated');
    });
});

describe('storage:updateLanguage', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('updates the language', async () => {
        await authHandlers['storage:updateLanguage'](event, 'ja');
        const user = state.collections['users'][0] as { language: string };
        expect(user.language).toBe('ja');
    });
});

// ─── Recovery codes ───────────────────────────────────────────────────────────

describe('storage:getRecoveryStatus', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns no codes when none have been generated', async () => {
        const status = (await authHandlers['storage:getRecoveryStatus'](event)) as {
            hasRecoveryCodes: boolean;
            totalCodes: number;
        };
        expect(status.hasRecoveryCodes).toBe(false);
        expect(status.totalCodes).toBe(0);
    });

    it('rejects when not authenticated', async () => {
        await authHandlers['storage:logout'](event);
        await expect(authHandlers['storage:getRecoveryStatus'](event)).rejects.toThrow('Not authenticated');
    });
});

describe('storage:generateRecoveryCodes', () => {
    beforeEach(async () => {
        resetState();
        await registerUser();
    });

    it('returns 10 plaintext codes', async () => {
        const res = (await authHandlers['storage:generateRecoveryCodes'](event, 'password123')) as {
            codes: string[];
        };
        expect(res.codes).toHaveLength(10);
    });

    it('stores hashed codes on the user record', async () => {
        await authHandlers['storage:generateRecoveryCodes'](event, 'password123');
        const user = state.collections['users'][0] as {
            recoveryCodes: Array<{ hash: string; salt: string; used: boolean }>;
        };
        expect(user.recoveryCodes).toHaveLength(10);
        user.recoveryCodes.forEach((c) => {
            expect(c.hash).toBeTruthy();
            expect(c.salt).toBeTruthy();
            expect(c.used).toBe(false);
        });
    });

    it('updates recovery status after generation', async () => {
        await authHandlers['storage:generateRecoveryCodes'](event, 'password123');
        const status = (await authHandlers['storage:getRecoveryStatus'](event)) as {
            hasRecoveryCodes: boolean;
            remainingCodes: number;
        };
        expect(status.hasRecoveryCodes).toBe(true);
        expect(status.remainingCodes).toBe(10);
    });

    it('rejects with wrong password', async () => {
        await expect(authHandlers['storage:generateRecoveryCodes'](event, 'wrongpass')).rejects.toThrow(
            'Invalid password',
        );
    });
});

describe('storage:resetPasswordWithRecoveryCode', () => {
    let codes: string[] = [];

    beforeEach(async () => {
        resetState();
        await registerUser();
        const res = (await authHandlers['storage:generateRecoveryCodes'](event, 'password123')) as {
            codes: string[];
        };
        codes = res.codes;
    });

    it('resets password with a valid recovery code', async () => {
        await authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', codes[0], 'brandnewpass');
        // Verify login works with the new password
        state.savedSession = null;
        const res = (await authHandlers['storage:login'](event, 'testuser', 'brandnewpass')) as {
            token: string;
        };
        expect(res.token).toBeTruthy();
    });

    it('marks the recovery code as used', async () => {
        await authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', codes[0], 'newpass12345');
        const user = state.collections['users'][0] as {
            recoveryCodes: Array<{ used: boolean }>;
        };
        expect(user.recoveryCodes[0].used).toBe(true);
    });

    it('rejects a used code on second attempt', async () => {
        await authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', codes[0], 'newpass12345');
        await expect(
            authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', codes[0], 'anotherpass1'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects an invalid code', async () => {
        await expect(
            authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', 'INVALID1', 'newpass12345'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects a non-existent username', async () => {
        await expect(
            authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'ghost', codes[0], 'newpass12345'),
        ).rejects.toThrow('Invalid username or recovery code');
    });

    it('rejects short new password', async () => {
        await expect(
            authHandlers['storage:resetPasswordWithRecoveryCode'](event, 'testuser', codes[0], 'short'),
        ).rejects.toThrow('Password must be at least 8 characters');
    });
});
