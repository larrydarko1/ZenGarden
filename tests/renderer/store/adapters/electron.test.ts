import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ElectronStorageAdapter } from '@/renderer/store/adapters/electron';
import type { IpcResult } from '@/schemas/storage';

/** The success envelope every bridge method now answers with. */
function ok<T>(data: T): IpcResult<T> {
    return { success: true, data };
}
let mockAPI: ReturnType<typeof createMockAPI>;

function createMockAPI() {
    return {
        isElectron: () => true,
        register: vi
            .fn()
            .mockResolvedValue(
                ok({ message: 'ok', user: { username: 'u', theme: 'dark', language: 'en' }, token: 't' }),
            ),
        login: vi
            .fn()
            .mockResolvedValue(
                ok({ message: 'ok', user: { username: 'u', theme: 'dark', language: 'en' }, token: 't' }),
            ),
        logout: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        getCurrentUser: vi.fn().mockResolvedValue(ok({ username: 'u', theme: 'dark', language: 'en' })),
        updateUsername: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        updatePassword: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        deleteAccount: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        updateTheme: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        updateLanguage: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
        createMeditation: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15', duration: 10 })),
        getMeditations: vi.fn().mockResolvedValue(ok([{ _id: '1', date: '2025-01-15' }])),
        saveEmotionLog: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15', emotions: [] })),
        getEmotionLogs: vi.fn().mockResolvedValue(ok([{ _id: '1' }])),
        getEmotionAnalytics: vi.fn().mockResolvedValue(ok({ totalDays: 5 })),
        saveEightfoldPathLog: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15' })),
        getEightfoldPathLogs: vi.fn().mockResolvedValue(ok([{ _id: '1' }])),
        getEightfoldPathAnalytics: vi.fn().mockResolvedValue(ok({ totalDays: 3 })),
        getRecoveryStatus: vi
            .fn()
            .mockResolvedValue(ok({ hasRecoveryCodes: false, totalCodes: 0, usedCodes: 0, remainingCodes: 0 })),
        generateRecoveryCodes: vi.fn().mockResolvedValue(ok({ codes: ['A', 'B'] })),
        resetPasswordWithRecoveryCode: vi.fn().mockResolvedValue(ok({ message: 'ok' })),
    };
}

beforeEach(() => {
    mockAPI = createMockAPI();
    (window as { electronAPI?: unknown }).electronAPI = mockAPI;
});

describe('ElectronStorageAdapter', () => {
    describe('constructor', () => {
        it('throws when electronAPI is not available', () => {
            delete (window as { electronAPI?: unknown }).electronAPI;
            expect(() => new ElectronStorageAdapter()).toThrow('Electron API not available');
        });

        it('creates successfully when electronAPI exists', () => {
            expect(() => new ElectronStorageAdapter()).not.toThrow();
        });
    });

    describe('probeAvailability', () => {
        it('returns true when electronAPI exists', async () => {
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.probeAvailability()).toBe(true);
        });
    });

    describe('auth operations', () => {
        it('register passes credentials to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.register({ username: 'user', password: 'pass' }, { theme: 'dark', language: 'en' });
            expect(mockAPI.register).toHaveBeenCalledWith('user', 'pass', { theme: 'dark', language: 'en' });
        });

        it('login passes credentials to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.login({ username: 'user', password: 'pass' });
            expect(mockAPI.login).toHaveBeenCalledWith('user', 'pass');
        });

        it('logout calls IPC logout', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.logout();
            expect(mockAPI.logout).toHaveBeenCalled();
        });

        it('getCurrentUser wraps result in { user }', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getCurrentUser();
            expect(res.user.username).toBe('u');
        });

        it('getCurrentUser throws when user is null', async () => {
            mockAPI.getCurrentUser.mockResolvedValue(ok(null));
            const adapter = new ElectronStorageAdapter();
            await expect(adapter.getCurrentUser()).rejects.toThrow('Not authenticated');
        });
    });

    describe('settings operations', () => {
        it('updateTheme returns theme in response', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.updateTheme('light');
            expect(res.theme).toBe('light');
            expect(mockAPI.updateTheme).toHaveBeenCalledWith('light');
        });

        it('updateLanguage returns language in response', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.updateLanguage('ja');
            expect(res.language).toBe('ja');
            expect(mockAPI.updateLanguage).toHaveBeenCalledWith('ja');
        });

        it('updateUsername returns username in response', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.updateUsername('newname', 'pass');
            expect(res.username).toBe('newname');
            expect(mockAPI.updateUsername).toHaveBeenCalledWith('newname', 'pass');
        });
    });

    describe('meditation operations', () => {
        it('createMeditation passes input fields to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.createMeditation({ date: '2025-01-15', duration: 10, notes: 'calm' });
            expect(mockAPI.createMeditation).toHaveBeenCalledWith('2025-01-15', 10, 'calm');
        });

        it('getMeditations wraps array in { meditations }', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getMeditations();
            expect(res.meditations).toHaveLength(1);
        });
    });

    describe('emotion operations', () => {
        it('saveEmotionLog passes input fields to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            const emotions = [{ name: 'joy', type: 'positive' as const }];
            await adapter.saveEmotionLog({ date: '2025-01-15', emotions, note: 'good' });
            expect(mockAPI.saveEmotionLog).toHaveBeenCalledWith('2025-01-15', emotions, 'good');
        });

        it('getEmotionLogs wraps array in { emotionLogs }', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getEmotionLogs();
            expect(res.emotionLogs).toHaveLength(1);
        });

        it('getEmotionAnalytics returns analytics directly', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getEmotionAnalytics(30);
            expect(res.totalDays).toBe(5);
        });
    });

    describe('eightfold path operations', () => {
        it('saveEightfoldPathLog passes input fields to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            const paths = [{ path: 'Right View', note: 'yes' }];
            await adapter.saveEightfoldPathLog({ date: '2025-01-15', paths });
            expect(mockAPI.saveEightfoldPathLog).toHaveBeenCalledWith('2025-01-15', paths);
        });

        it('getEightfoldPathLogs wraps array in { pathLogs }', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getEightfoldPathLogs();
            expect(res.pathLogs).toHaveLength(1);
        });

        it('getEightfoldPathAnalytics returns analytics directly', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getEightfoldPathAnalytics(30);
            expect(res.totalDays).toBe(3);
        });
    });

    describe('recovery code operations', () => {
        it('getRecoveryStatus returns status', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.getRecoveryStatus();
            expect(res.hasRecoveryCodes).toBe(false);
        });

        it('generateRecoveryCodes passes password to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            const res = await adapter.generateRecoveryCodes('pass');
            expect(res.codes).toEqual(['A', 'B']);
            expect(mockAPI.generateRecoveryCodes).toHaveBeenCalledWith('pass');
        });

        it('resetPasswordWithRecoveryCode passes all args to IPC', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.resetPasswordWithRecoveryCode('user', 'CODE', 'newpass');
            expect(mockAPI.resetPasswordWithRecoveryCode).toHaveBeenCalledWith('user', 'CODE', 'newpass');
        });
    });
});
