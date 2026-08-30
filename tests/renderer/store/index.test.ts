import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    findVaultPath,
    chooseVault,
    closeVault,
    vaultIsPickable,
    getSettings,
    updateTheme,
    updateLanguage,
    createMeditation,
    getMeditations,
    saveEmotionLog,
    getEmotionLogs,
    getEmotionAnalytics,
    saveEightfoldPathLog,
    getEightfoldPathLogs,
    getEightfoldPathAnalytics,
    checkStorageAvailability,
} from '@/renderer/store';

const mockAdapter = vi.hoisted(() => ({
    probeAvailability: vi.fn().mockResolvedValue(true),
    findVaultPath: vi.fn().mockResolvedValue('/vault'),
    chooseVault: vi.fn().mockResolvedValue('/chosen'),
    closeVault: vi.fn().mockResolvedValue(undefined),
    canChooseVault: vi.fn().mockReturnValue(true),
    getSettings: vi.fn().mockResolvedValue({ theme: 'dark', language: 'en' }),
    updateTheme: vi.fn().mockResolvedValue({ theme: 'light', language: 'en' }),
    updateLanguage: vi.fn().mockResolvedValue({ theme: 'dark', language: 'ja' }),
    createMeditation: vi.fn().mockResolvedValue({ message: 'ok', meditation: {} }),
    getMeditations: vi.fn().mockResolvedValue({ meditations: [] }),
    saveEmotionLog: vi.fn().mockResolvedValue({ message: 'ok', emotionLog: {} }),
    getEmotionLogs: vi.fn().mockResolvedValue({ emotionLogs: [] }),
    getEmotionAnalytics: vi.fn().mockResolvedValue({ totalDays: 0 }),
    saveEightfoldPathLog: vi.fn().mockResolvedValue({ message: 'ok', pathLog: {} }),
    getEightfoldPathLogs: vi.fn().mockResolvedValue({ pathLogs: [] }),
    getEightfoldPathAnalytics: vi.fn().mockResolvedValue({ totalDays: 0 }),
}));

vi.mock('@/renderer/store/adapters/factory', () => ({
    getAdapter: vi.fn().mockResolvedValue(mockAdapter),
    checkAvailability: vi.fn().mockResolvedValue({ server: false, local: true }),
    resetAdapter: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('store convenience functions', () => {
    it('findVaultPath delegates to adapter', async () => {
        expect(await findVaultPath()).toBe('/vault');
        expect(mockAdapter.findVaultPath).toHaveBeenCalled();
    });

    it('chooseVault delegates to adapter', async () => {
        expect(await chooseVault()).toBe('/chosen');
        expect(mockAdapter.chooseVault).toHaveBeenCalled();
    });

    it('closeVault delegates to adapter', async () => {
        await closeVault();
        expect(mockAdapter.closeVault).toHaveBeenCalled();
    });

    it('vaultIsPickable delegates to adapter', async () => {
        expect(await vaultIsPickable()).toBe(true);
    });

    it('getSettings delegates to adapter', async () => {
        expect(await getSettings()).toEqual({ theme: 'dark', language: 'en' });
    });

    it('updateTheme delegates to adapter', async () => {
        await updateTheme('light');
        expect(mockAdapter.updateTheme).toHaveBeenCalledWith('light');
    });

    it('updateLanguage delegates to adapter', async () => {
        await updateLanguage('ja');
        expect(mockAdapter.updateLanguage).toHaveBeenCalledWith('ja');
    });

    it('createMeditation delegates to adapter', async () => {
        await createMeditation('2025-01-15', 10, 'notes');
        expect(mockAdapter.createMeditation).toHaveBeenCalledWith({
            date: '2025-01-15',
            duration: 10,
            notes: 'notes',
        });
    });

    it('getMeditations delegates to adapter', async () => {
        await getMeditations();
        expect(mockAdapter.getMeditations).toHaveBeenCalled();
    });

    it('saveEmotionLog delegates to adapter', async () => {
        const emotions = [{ name: 'joy', type: 'positive' as const }];
        await saveEmotionLog('2025-01-15', emotions, 'note');
        expect(mockAdapter.saveEmotionLog).toHaveBeenCalledWith({
            date: '2025-01-15',
            emotions,
            note: 'note',
        });
    });

    it('getEmotionLogs delegates to adapter', async () => {
        await getEmotionLogs({ startDate: '2025-01-01' });
        expect(mockAdapter.getEmotionLogs).toHaveBeenCalledWith({ startDate: '2025-01-01' });
    });

    it('getEmotionAnalytics delegates to adapter', async () => {
        await getEmotionAnalytics(30);
        expect(mockAdapter.getEmotionAnalytics).toHaveBeenCalledWith(30);
    });

    it('saveEightfoldPathLog delegates to adapter', async () => {
        const paths = [{ path: 'Right View', note: 'yes' }];
        await saveEightfoldPathLog('2025-01-15', paths);
        expect(mockAdapter.saveEightfoldPathLog).toHaveBeenCalledWith({ date: '2025-01-15', paths });
    });

    it('getEightfoldPathLogs delegates to adapter', async () => {
        await getEightfoldPathLogs();
        expect(mockAdapter.getEightfoldPathLogs).toHaveBeenCalledWith(undefined);
    });

    it('getEightfoldPathAnalytics delegates to adapter', async () => {
        await getEightfoldPathAnalytics(60);
        expect(mockAdapter.getEightfoldPathAnalytics).toHaveBeenCalledWith(60);
    });

    it('checkStorageAvailability returns availability info', async () => {
        const res = await checkStorageAvailability();
        expect(res).toEqual({ server: false, local: true });
    });
});
