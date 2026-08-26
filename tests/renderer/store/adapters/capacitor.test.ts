import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CapacitorStorageAdapter } from '@/renderer/store/adapters/capacitor';

const mockPreferences = vi.hoisted(() => ({ get: vi.fn().mockResolvedValue({ value: null }) }));
// Shared mock state for db sub-module — hoisted so vi.mock can reference it
const state = vi.hoisted(() => ({
    collections: {} as Record<string, unknown[]>,
    session: {} as Record<string, string | undefined>,
}));

vi.mock('@capacitor/preferences', () => ({
    Preferences: mockPreferences,
}));

vi.mock('@/renderer/store/adapters/capacitor/db', () => ({
    DB_FILES: {
        users: 'users.json',
        meditations: 'meditations.json',
        emotionLogs: 'emotion_logs.json',
        eightfoldPathLogs: 'eightfold_path_logs.json',
        session: 'session.json',
    },
    readCollection: vi.fn(async (filename: string) => {
        return JSON.parse(JSON.stringify(state.collections[filename] ?? []));
    }),
    writeCollection: vi.fn(async (filename: string, data: unknown[]) => {
        state.collections[filename] = JSON.parse(JSON.stringify(data));
    }),
    readSession: vi.fn(async () => ({ ...state.session })),
    writeSession: vi.fn(async (s: Record<string, string | undefined>) => {
        state.session = { ...s };
    }),
    generateObjectId: vi.fn(() => 'generated-id-' + Math.random().toString(36).slice(2, 8)),
    initializeStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/renderer/store/adapters/capacitor/crypto', () => ({
    hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
    verifyPassword: vi.fn(async (password: string, stored: string) => stored === `hashed:${password}`),
    upgradeHashIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

describe('CapacitorStorageAdapter', () => {
    let adapter: CapacitorStorageAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        state.collections = {};
        state.session = {};
        adapter = new CapacitorStorageAdapter();
    });

    describe('probeAvailability', () => {
        it('returns true when Preferences API works', async () => {
            expect(await adapter.probeAvailability()).toBe(true);
        });

        it('returns false when Preferences API throws', async () => {
            mockPreferences.get.mockRejectedValueOnce(new Error('not available'));
            expect(await adapter.probeAvailability()).toBe(false);
        });
    });

    describe('register', () => {
        it('creates a new user and sets session', async () => {
            const result = await adapter.register({ username: 'monk', password: 'password123' }, 'dark', 'en');
            expect(result.message).toContain('successful');
            expect(result.user.username).toBe('monk');
            expect(state.session.currentUser).toBe('monk');
        });

        it('rejects duplicate username', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.register({ username: 'monk', password: 'pass5678' })).rejects.toThrow(
                'Username already exists',
            );
        });

        it('rejects short password', async () => {
            await expect(adapter.register({ username: 'monk', password: 'short' })).rejects.toThrow(
                'at least 8 characters',
            );
        });

        it('does not include password in response', async () => {
            const result = await adapter.register({ username: 'monk', password: 'password123' });
            expect((result.user as unknown as Record<string, unknown>)['password']).toBeUndefined();
        });
    });

    describe('login', () => {
        it('logs in with valid credentials', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.login({ username: 'monk', password: 'password123' });
            expect(result.message).toContain('successful');
            expect(result.user.username).toBe('monk');
        });

        it('rejects invalid password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.login({ username: 'monk', password: 'wrong' })).rejects.toThrow('Invalid');
        });

        it('rejects non-existent user', async () => {
            await expect(adapter.login({ username: 'ghost', password: 'pass1234' })).rejects.toThrow('Invalid');
        });
    });

    describe('logout', () => {
        it('clears the session', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.logout();
            expect(state.session.currentUser).toBeUndefined();
        });
    });

    describe('getCurrentUser', () => {
        it('returns the logged-in user', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.getCurrentUser();
            expect(result.user.username).toBe('monk');
        });

        it('throws when not authenticated', async () => {
            await expect(adapter.getCurrentUser()).rejects.toThrow('Not authenticated');
        });
    });

    describe('updateTheme', () => {
        it('updates theme for current user', async () => {
            await adapter.register({ username: 'monk', password: 'password123' }, 'dark', 'en');
            const result = await adapter.updateTheme('light');
            expect(result.theme).toBe('light');
        });

        it('throws when not authenticated', async () => {
            await expect(adapter.updateTheme('light')).rejects.toThrow('Not authenticated');
        });
    });

    describe('updateLanguage', () => {
        it('updates language for current user', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.updateLanguage('ja');
            expect(result.language).toBe('ja');
        });
    });

    describe('updateUsername', () => {
        it('updates username and session', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.updateUsername('zen_monk', 'password123');
            expect(result.username).toBe('zen_monk');
            expect(state.session.currentUser).toBe('zen_monk');
        });

        it('rejects if password is wrong', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.updateUsername('zen', 'wrong')).rejects.toThrow('Invalid password');
        });

        it('rejects if new username already taken', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.logout();
            await adapter.register({ username: 'other', password: 'password123' });
            await expect(adapter.updateUsername('monk', 'password123')).rejects.toThrow('already exists');
        });
    });

    describe('updatePassword', () => {
        it('updates password when current password is valid', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.updatePassword('password123', 'newpassword456');
            expect(result.message).toContain('updated');
        });

        it('rejects wrong current password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.updatePassword('wrong', 'newpassword456')).rejects.toThrow('incorrect');
        });

        it('rejects short new password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.updatePassword('password123', 'short')).rejects.toThrow('at least 8');
        });
    });

    describe('deleteAccount', () => {
        it('removes user and clears session', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.deleteAccount('password123');
            expect(result.message).toContain('deleted');
            expect(state.session.currentUser).toBeUndefined();
        });

        it('rejects wrong password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.deleteAccount('wrong')).rejects.toThrow('Invalid password');
        });
    });

    describe('createMeditation', () => {
        it('creates a meditation record', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.createMeditation({
                date: '2025-01-15',
                duration: 600,
                notes: 'peaceful',
            });
            expect(result.meditation.duration).toBe(600);
            expect(result.meditation.username).toBe('monk');
        });
    });

    describe('getMeditations', () => {
        it('returns only current user meditations', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.createMeditation({ date: '2025-01-15', duration: 600, notes: '' });
            await adapter.logout();
            await adapter.register({ username: 'other', password: 'password123' });
            await adapter.createMeditation({ date: '2025-01-16', duration: 300, notes: '' });

            const result = await adapter.getMeditations();
            expect(result.meditations).toHaveLength(1);
            expect(result.meditations[0].username).toBe('other');
        });
    });

    describe('saveEmotionLog', () => {
        it('creates a new emotion log', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.saveEmotionLog({
                date: '2025-01-15',
                emotions: [{ name: 'Joy', type: 'positive' }],
                note: 'happy day',
            });
            expect(result.emotionLog.emotions).toHaveLength(1);
            expect(result.emotionLog.positiveCount).toBe(1);
        });

        it('updates existing log for same date', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.saveEmotionLog({
                date: '2025-01-15',
                emotions: [{ name: 'Joy', type: 'positive' }],
            });
            await adapter.saveEmotionLog({
                date: '2025-01-15',
                emotions: [{ name: 'Sadness', type: 'negative' }],
            });

            const result = await adapter.getEmotionLogs();
            expect(result.emotionLogs).toHaveLength(1);
            expect(result.emotionLogs[0].emotions[0].name).toBe('Sadness');
        });
    });

    describe('getEmotionLogs', () => {
        it('applies date range filter', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.saveEmotionLog({
                date: '2025-01-10',
                emotions: [{ name: 'Joy', type: 'positive' }],
            });
            await adapter.saveEmotionLog({
                date: '2025-01-20',
                emotions: [{ name: 'Calm', type: 'positive' }],
            });

            const result = await adapter.getEmotionLogs({
                startDate: '2025-01-15',
                endDate: '2025-01-25',
            });
            expect(result.emotionLogs).toHaveLength(1);
            expect(result.emotionLogs[0].date).toBe('2025-01-20');
        });
    });

    describe('getEmotionAnalytics', () => {
        it('returns analytics structure', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const analytics = await adapter.getEmotionAnalytics(30);
            expect(analytics).toHaveProperty('totalDays');
            expect(analytics).toHaveProperty('topEmotions');
            expect(analytics).toHaveProperty('trends');
        });
    });

    describe('saveEightfoldPathLog', () => {
        it('creates a new path log', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.saveEightfoldPathLog({
                date: '2025-01-15',
                paths: [{ path: 'rightView', note: 'reflected' }],
            });
            expect(result.pathLog.paths).toHaveLength(1);
            expect(result.pathLog.completedCount).toBe(1);
        });
    });

    describe('getEightfoldPathLogs', () => {
        it('returns logs for current user', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.saveEightfoldPathLog({
                date: '2025-01-15',
                paths: [{ path: 'rightView', note: 'yes' }],
            });
            const result = await adapter.getEightfoldPathLogs();
            expect(result.pathLogs).toHaveLength(1);
        });
    });

    describe('getEightfoldPathAnalytics', () => {
        it('returns analytics structure', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const analytics = await adapter.getEightfoldPathAnalytics(30);
            expect(analytics).toHaveProperty('totalDays');
            expect(analytics).toHaveProperty('averageCompletion');
            expect(analytics).toHaveProperty('perfectDays');
            expect(analytics).toHaveProperty('mostFollowedPaths');
            expect(analytics).toHaveProperty('trends');
        });
    });

    describe('exportData', () => {
        it('exports user data as JSON', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await adapter.createMeditation({ date: '2025-01-15', duration: 600, notes: '' });

            const json = await adapter.exportData();
            const data = JSON.parse(json);
            expect(data).toHaveProperty('meditations');
            expect(data).toHaveProperty('exportDate');
            expect(data.meditations).toHaveLength(1);
        });
    });

    describe('importData', () => {
        it('imports valid JSON data', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const data = JSON.stringify({
                meditations: [{ Date: '2025-01-15', duration: 600 }],
                emotionLogs: [{ date: '2025-01-15', emotions: [{ name: 'Joy', type: 'positive' }] }],
            });

            const result = await adapter.importData(data);
            expect(result.imported.meditations).toBe(1);
            expect(result.imported.emotionLogs).toBe(1);
        });

        it('rejects invalid JSON', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.importData('not json')).rejects.toThrow('Invalid JSON');
        });

        it('rejects non-object JSON', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.importData('"just a string"')).rejects.toThrow('must be a JSON object');
        });
    });

    describe('getRecoveryStatus', () => {
        it('returns no codes when none generated', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const status = await adapter.getRecoveryStatus();
            expect(status.hasRecoveryCodes).toBe(false);
            expect(status.totalCodes).toBe(0);
        });
    });

    describe('generateRecoveryCodes', () => {
        it('generates 10 codes with valid password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            const result = await adapter.generateRecoveryCodes('password123');
            expect(result.codes).toHaveLength(10);
            result.codes.forEach((code) => {
                expect(code).toMatch(/^[0-9A-Z]+$/);
            });
        });

        it('rejects invalid password', async () => {
            await adapter.register({ username: 'monk', password: 'password123' });
            await expect(adapter.generateRecoveryCodes('wrong')).rejects.toThrow('Invalid password');
        });
    });

    describe('resetPasswordWithRecoveryCode', () => {
        it('rejects short new password', async () => {
            await expect(adapter.resetPasswordWithRecoveryCode('monk', 'CODE1234', 'short')).rejects.toThrow(
                'at least 8',
            );
        });

        it('rejects non-existent user', async () => {
            await expect(adapter.resetPasswordWithRecoveryCode('ghost', 'CODE1234', 'newpass12345')).rejects.toThrow(
                'Invalid',
            );
        });
    });
});
