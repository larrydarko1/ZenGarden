import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { ElectronAPI } from '@/schemas/electron';

const mockInvoke = vi.fn().mockResolvedValue(undefined);

let capturedApi: ElectronAPI | undefined;
let capturedChannel = '';

// Typed as the contract: the preload annotates the object it exposes as ElectronAPI,
// so this is the shape it hands over — and every call below is checked against it.
vi.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: (channel: string, api: ElectronAPI) => {
            capturedChannel = channel;
            capturedApi = api;
        },
    },
    ipcRenderer: { invoke: mockInvoke },
}));

function exposed(): ElectronAPI {
    if (capturedApi === undefined) throw new Error('The preload exposed nothing');
    return capturedApi;
}

await import('@/preload/index');

beforeEach(() => {
    vi.clearAllMocks();
});

describe('preload / electronAPI', () => {
    describe('bridge installation', () => {
        it('exposes the API under the name the renderer reads', () => {
            expect(capturedChannel).toBe('electronAPI');
        });

        it('isElectron returns true, which is how the factory picks this adapter', () => {
            expect(exposed().isElectron()).toBe(true);
        });
    });

    describe('IPC invoke methods', () => {
        const invokeTests: [keyof ElectronAPI, string, unknown[], (api: ElectronAPI) => unknown][] = [
            ['findVaultPath', 'vault:findPath', [], (api) => api.findVaultPath()],
            ['chooseVault', 'vault:choose', [], (api) => api.chooseVault()],
            ['closeVault', 'vault:close', [], (api) => api.closeVault()],
            ['getSettings', 'settings:get', [], (api) => api.getSettings()],
            ['updateTheme', 'settings:updateTheme', ['light'], (api) => api.updateTheme('light')],
            ['updateLanguage', 'settings:updateLanguage', ['fr'], (api) => api.updateLanguage('fr')],
            [
                'createMeditation',
                'storage:createMeditation',
                ['2025-01-15', 10, 'notes'],
                (api) => api.createMeditation('2025-01-15', 10, 'notes'),
            ],
            ['getMeditations', 'storage:getMeditations', [], (api) => api.getMeditations()],
            [
                'saveEmotionLog',
                'storage:saveEmotionLog',
                ['2025-01-15', [], 'note'],
                (api) => api.saveEmotionLog('2025-01-15', [], 'note'),
            ],
            ['getEmotionLogs', 'storage:getEmotionLogs', [{ limit: 5 }], (api) => api.getEmotionLogs({ limit: 5 })],
            ['getEmotionAnalytics', 'storage:getEmotionAnalytics', [30], (api) => api.getEmotionAnalytics(30)],
            [
                'saveEightfoldPathLog',
                'storage:saveEightfoldPathLog',
                ['2025-01-15', []],
                (api) => api.saveEightfoldPathLog('2025-01-15', []),
            ],
            [
                'getEightfoldPathLogs',
                'storage:getEightfoldPathLogs',
                [{ limit: 5 }],
                (api) => api.getEightfoldPathLogs({ limit: 5 }),
            ],
        ];

        for (const [method, channel, args, call] of invokeTests) {
            it(`${method} invokes "${channel}"`, () => {
                call(exposed());
                expect(mockInvoke).toHaveBeenCalledWith(channel, ...args);
            });
        }

        it('exposes exactly the methods the contract declares — nothing extra reaches the renderer', () => {
            expect(Object.keys(exposed()).sort()).toEqual(
                ['isElectron', ...invokeTests.map(([method]) => method)].sort(),
            );
        });
    });

    describe('optional arguments', () => {
        it('passes undefined through for an omitted emotion-log note', () => {
            void exposed().saveEmotionLog('2025-01-15', []);
            expect(mockInvoke).toHaveBeenCalledWith('storage:saveEmotionLog', '2025-01-15', [], undefined);
        });

        it('passes undefined through for an omitted analytics window', () => {
            void exposed().getEmotionAnalytics();
            expect(mockInvoke).toHaveBeenCalledWith('storage:getEmotionAnalytics', undefined);
        });
    });
});
