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
        findVaultPath: vi.fn().mockResolvedValue(ok('/vault')),
        chooseVault: vi.fn().mockResolvedValue(ok('/chosen')),
        closeVault: vi.fn().mockResolvedValue(ok(null)),
        getSettings: vi.fn().mockResolvedValue(ok({ theme: 'dark', language: 'en' })),
        updateTheme: vi.fn().mockResolvedValue(ok({ theme: 'light', language: 'en' })),
        updateLanguage: vi.fn().mockResolvedValue(ok({ theme: 'dark', language: 'ja' })),
        createMeditation: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15', duration: 10 })),
        getMeditations: vi.fn().mockResolvedValue(ok([{ _id: '1', date: '2025-01-15' }])),
        saveEmotionLog: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15', emotions: [] })),
        getEmotionLogs: vi.fn().mockResolvedValue(ok([{ _id: '1' }])),
        getEmotionAnalytics: vi.fn().mockResolvedValue(ok({ totalDays: 5 })),
        saveEightfoldPathLog: vi.fn().mockResolvedValue(ok({ _id: '1', date: '2025-01-15' })),
        getEightfoldPathLogs: vi.fn().mockResolvedValue(ok([{ _id: '1' }])),
        getEightfoldPathAnalytics: vi.fn().mockResolvedValue(ok({ totalDays: 3 })),
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

    describe('vault operations', () => {
        it('findVaultPath returns the open vault', async () => {
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.findVaultPath()).toBe('/vault');
        });

        // Null is a cancelled dialog, not an error: it has to survive the
        // unwrapping rather than be turned into a throw.
        it('chooseVault passes a cancelled dialog through as null', async () => {
            mockAPI.chooseVault.mockResolvedValue(ok(null));
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.chooseVault()).toBeNull();
        });

        it('closeVault calls the bridge', async () => {
            const adapter = new ElectronStorageAdapter();
            await adapter.closeVault();
            expect(mockAPI.closeVault).toHaveBeenCalled();
        });

        it('canChooseVault is true — the desktop has a folder picker', () => {
            expect(new ElectronStorageAdapter().canChooseVault()).toBe(true);
        });

        it('turns a handler failure back into a throw', async () => {
            mockAPI.findVaultPath.mockResolvedValue({ success: false, error: 'nope' });
            const adapter = new ElectronStorageAdapter();
            await expect(adapter.findVaultPath()).rejects.toThrow('nope');
        });
    });

    describe('settings operations', () => {
        it('getSettings returns the vault settings', async () => {
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.getSettings()).toEqual({ theme: 'dark', language: 'en' });
        });

        it('updateTheme returns the settings the handler wrote', async () => {
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.updateTheme('light')).toEqual({ theme: 'light', language: 'en' });
            expect(mockAPI.updateTheme).toHaveBeenCalledWith('light');
        });

        it('updateLanguage returns the settings the handler wrote', async () => {
            const adapter = new ElectronStorageAdapter();
            expect(await adapter.updateLanguage('ja')).toEqual({ theme: 'dark', language: 'ja' });
            expect(mockAPI.updateLanguage).toHaveBeenCalledWith('ja');
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
});
