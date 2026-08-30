import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn().mockResolvedValue(undefined);

let capturedApi: Record<string, unknown> = {};
let capturedChannel = '';

vi.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: (channel: string, api: Record<string, unknown>) => {
            capturedChannel = channel;
            capturedApi = api;
        },
    },
    ipcRenderer: { invoke: mockInvoke },
}));

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
            expect((capturedApi.isElectron as () => boolean)()).toBe(true);
        });
    });

    describe('IPC invoke methods', () => {
        const invokeTests: [string, string, unknown[]][] = [
            ['findVaultPath', 'vault:findPath', []],
            ['chooseVault', 'vault:choose', []],
            ['closeVault', 'vault:close', []],
            ['getSettings', 'settings:get', []],
            ['updateTheme', 'settings:updateTheme', ['light']],
            ['updateLanguage', 'settings:updateLanguage', ['fr']],
            ['createMeditation', 'storage:createMeditation', ['2025-01-15', 10, 'notes']],
            ['getMeditations', 'storage:getMeditations', []],
            ['saveEmotionLog', 'storage:saveEmotionLog', ['2025-01-15', [], 'note']],
            ['getEmotionLogs', 'storage:getEmotionLogs', [{ limit: 5 }]],
            ['getEmotionAnalytics', 'storage:getEmotionAnalytics', [30]],
            ['saveEightfoldPathLog', 'storage:saveEightfoldPathLog', ['2025-01-15', []]],
            ['getEightfoldPathLogs', 'storage:getEightfoldPathLogs', [{ limit: 5 }]],
            ['getEightfoldPathAnalytics', 'storage:getEightfoldPathAnalytics', [30]],
        ];

        for (const [method, channel, args] of invokeTests) {
            it(`${method} invokes "${channel}"`, () => {
                (capturedApi[method] as (...a: unknown[]) => unknown)(...args);
                expect(mockInvoke).toHaveBeenCalledWith(channel, ...args);
            });
        }

        it('exposes exactly the methods the contract declares — nothing extra reaches the renderer', () => {
            expect(Object.keys(capturedApi).sort()).toEqual(
                ['isElectron', ...invokeTests.map(([method]) => method)].sort(),
            );
        });
    });

    describe('optional arguments', () => {
        it('passes undefined through for an omitted emotion-log note', () => {
            (capturedApi.saveEmotionLog as (d: string, e: unknown[]) => unknown)('2025-01-15', []);
            expect(mockInvoke).toHaveBeenCalledWith('storage:saveEmotionLog', '2025-01-15', [], undefined);
        });

        it('passes undefined through for an omitted analytics window', () => {
            (capturedApi.getEmotionAnalytics as () => unknown)();
            expect(mockInvoke).toHaveBeenCalledWith('storage:getEmotionAnalytics', undefined);
        });
    });
});
