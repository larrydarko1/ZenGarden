// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAdapter = vi.hoisted(() => ({
    isAvailable: vi.fn().mockResolvedValue(true),
    register: vi.fn().mockResolvedValue({ message: 'ok', user: { username: 'u' }, token: 't' }),
    login: vi.fn().mockResolvedValue({ message: 'ok', user: { username: 'u' }, token: 't' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockResolvedValue({ user: { username: 'u' } }),
    updateUsername: vi.fn().mockResolvedValue({ message: 'ok', username: 'new', token: '' }),
    updatePassword: vi.fn().mockResolvedValue({ message: 'ok' }),
    deleteAccount: vi.fn().mockResolvedValue({ message: 'ok' }),
    updateTheme: vi.fn().mockResolvedValue({ message: 'ok', theme: 'dark' }),
    updateLanguage: vi.fn().mockResolvedValue({ message: 'ok', language: 'en' }),
    createMeditation: vi.fn().mockResolvedValue({ message: 'ok', meditation: {} }),
    getMeditations: vi.fn().mockResolvedValue({ meditations: [] }),
    saveEmotionLog: vi.fn().mockResolvedValue({ message: 'ok', emotionLog: {} }),
    getEmotionLogs: vi.fn().mockResolvedValue({ emotionLogs: [] }),
    getEmotionAnalytics: vi.fn().mockResolvedValue({ totalDays: 0 }),
    saveEightfoldPathLog: vi.fn().mockResolvedValue({ message: 'ok', pathLog: {} }),
    getEightfoldPathLogs: vi.fn().mockResolvedValue({ pathLogs: [] }),
    getEightfoldPathAnalytics: vi.fn().mockResolvedValue({ totalDays: 0 }),
    getRecoveryStatus: vi.fn().mockResolvedValue({ hasRecoveryCodes: false }),
    generateRecoveryCodes: vi.fn().mockResolvedValue({ codes: ['A', 'B'] }),
    resetPasswordWithRecoveryCode: vi.fn().mockResolvedValue({ message: 'ok' }),
    exportData: vi.fn().mockResolvedValue('{}'),
    importData: vi.fn().mockResolvedValue({ message: 'ok' }),
}));

vi.mock('../../../src/renderer/store/adapters/factory', () => ({
    StorageFactory: {
        getAdapter: vi.fn().mockResolvedValue(mockAdapter),
        checkAvailability: vi.fn().mockResolvedValue({ server: false, local: true }),
    },
}));

import {
    register,
    login,
    logout,
    getCurrentUser,
    updateUsername,
    updatePassword,
    deleteAccount,
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
    getRecoveryStatus,
    generateRecoveryCodes,
    resetPasswordWithRecoveryCode,
    exportData,
    importData,
    checkStorageAvailability,
} from '../../../src/renderer/store';

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
});

describe('store convenience functions', () => {
    // ── Auth ──────────────────────────────────────────────────────────────

    it('register delegates to adapter', async () => {
        await register('user1', 'password1', 'dark', 'en');
        expect(mockAdapter.register).toHaveBeenCalledWith({ username: 'user1', password: 'password1' }, 'dark', 'en');
    });

    it('login delegates to adapter', async () => {
        await login('user1', 'pass');
        expect(mockAdapter.login).toHaveBeenCalledWith({ username: 'user1', password: 'pass' });
    });

    it('logout delegates to adapter', async () => {
        await logout();
        expect(mockAdapter.logout).toHaveBeenCalled();
    });

    it('getCurrentUser delegates to adapter', async () => {
        const res = await getCurrentUser();
        expect(res).toEqual({ user: { username: 'u' } });
    });

    // ── User management ───────────────────────────────────────────────────

    it('updateUsername delegates to adapter', async () => {
        await updateUsername('newname', 'pass');
        expect(mockAdapter.updateUsername).toHaveBeenCalledWith('newname', 'pass');
    });

    it('updatePassword delegates to adapter', async () => {
        await updatePassword('old', 'new');
        expect(mockAdapter.updatePassword).toHaveBeenCalledWith('old', 'new');
    });

    it('deleteAccount delegates to adapter', async () => {
        await deleteAccount('pass');
        expect(mockAdapter.deleteAccount).toHaveBeenCalledWith('pass');
    });

    // ── Settings ──────────────────────────────────────────────────────────

    it('updateTheme delegates to adapter', async () => {
        await updateTheme('light');
        expect(mockAdapter.updateTheme).toHaveBeenCalledWith('light');
    });

    it('updateLanguage delegates to adapter', async () => {
        await updateLanguage('ja');
        expect(mockAdapter.updateLanguage).toHaveBeenCalledWith('ja');
    });

    // ── Meditations ───────────────────────────────────────────────────────

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

    // ── Emotions ──────────────────────────────────────────────────────────

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

    // ── Eightfold path ────────────────────────────────────────────────────

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

    // ── Recovery codes ────────────────────────────────────────────────────

    it('getRecoveryStatus delegates to adapter', async () => {
        await getRecoveryStatus();
        expect(mockAdapter.getRecoveryStatus).toHaveBeenCalled();
    });

    it('generateRecoveryCodes delegates to adapter', async () => {
        await generateRecoveryCodes('pass');
        expect(mockAdapter.generateRecoveryCodes).toHaveBeenCalledWith('pass');
    });

    it('resetPasswordWithRecoveryCode delegates to adapter', async () => {
        await resetPasswordWithRecoveryCode('user', 'CODE', 'newpass');
        expect(mockAdapter.resetPasswordWithRecoveryCode).toHaveBeenCalledWith('user', 'CODE', 'newpass');
    });

    // ── Export/import ─────────────────────────────────────────────────────

    it('exportData delegates to adapter', async () => {
        await exportData();
        expect(mockAdapter.exportData).toHaveBeenCalled();
    });

    it('importData delegates to adapter', async () => {
        await importData('{}');
        expect(mockAdapter.importData).toHaveBeenCalledWith('{}');
    });

    // ── Availability ──────────────────────────────────────────────────────

    it('checkStorageAvailability returns availability info', async () => {
        const res = await checkStorageAvailability();
        expect(res).toEqual({ server: false, local: true });
    });
});

describe('store export/import without adapter support', () => {
    it('exportData throws when adapter has no exportData', async () => {
        const original = mockAdapter.exportData;
        mockAdapter.exportData = undefined as unknown as typeof original;
        await expect(exportData()).rejects.toThrow('Export not supported');
        mockAdapter.exportData = original;
    });

    it('importData throws when adapter has no importData', async () => {
        const original = mockAdapter.importData;
        mockAdapter.importData = undefined as unknown as typeof original;
        await expect(importData('{}')).rejects.toThrow('Import not supported');
        mockAdapter.importData = original;
    });
});
