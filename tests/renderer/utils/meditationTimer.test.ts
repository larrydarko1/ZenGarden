import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
    clearPendingSession,
    dismissEndReminder,
    hasNativeTimer,
    loadPendingSession,
    savePendingSession,
    startNativeTimer,
    stopNativeTimer,
    type PendingSession,
} from '@/renderer/utils/meditationTimer';

const native = vi.hoisted(() => {
    const plugin = {
        start: vi.fn(() => Promise.resolve()),
        stop: vi.fn(() => Promise.resolve()),
        dismissEndReminder: vi.fn(() => Promise.resolve()),
    };
    return {
        plugin,
        isPluginAvailable: vi.fn(() => false),
        stored: new Map<string, string>(),
    };
});

vi.mock('@capacitor/core', () => ({
    Capacitor: { isPluginAvailable: native.isPluginAvailable },
    registerPlugin: () => native.plugin,
}));

vi.mock('@capacitor/preferences', () => ({
    Preferences: {
        get: ({ key }: { key: string }) => Promise.resolve({ value: native.stored.get(key) ?? null }),
        set: ({ key, value }: { key: string; value: string }) => {
            native.stored.set(key, value);
            return Promise.resolve();
        },
        remove: ({ key }: { key: string }) => {
            native.stored.delete(key);
            return Promise.resolve();
        },
    },
}));

const SESSION: PendingSession = {
    endsAt: 1_700_000_000_000,
    durationMin: 20,
    bellEnabled: true,
    bellInterval: 5,
    bellSound: '2',
};

/** Writes a raw value under the key the module uses, the way an older build might have. */
function storeRaw(value: string): void {
    native.stored.set('meditation.pendingSession', value);
}

describe('meditationTimer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        native.stored.clear();
    });

    describe('native plugin', () => {
        it('reports whether the plugin is available', () => {
            native.isPluginAvailable.mockReturnValueOnce(true);
            expect(hasNativeTimer()).toBe(true);
            expect(native.isPluginAvailable).toHaveBeenCalledWith('MeditationTimer');
        });

        it('passes calls through to the plugin', async () => {
            const options = { endsAt: 1, durationSec: 60, bellIntervalSec: 0, bellAsset: 'bell1.mp3' };
            await startNativeTimer(options);
            await stopNativeTimer();
            await dismissEndReminder();
            expect(native.plugin.start).toHaveBeenCalledWith(options);
            expect(native.plugin.stop).toHaveBeenCalledOnce();
            expect(native.plugin.dismissEndReminder).toHaveBeenCalledOnce();
        });
    });

    describe('pending session', () => {
        it('reads back what was saved', async () => {
            await savePendingSession(SESSION);
            await expect(loadPendingSession()).resolves.toEqual(SESSION);
        });

        it('is null once cleared', async () => {
            await savePendingSession(SESSION);
            await clearPendingSession();
            await expect(loadPendingSession()).resolves.toBeNull();
        });

        it('is null when nothing was saved', async () => {
            await expect(loadPendingSession()).resolves.toBeNull();
        });

        it('is null when the stored value is not JSON', async () => {
            storeRaw('{not json');
            await expect(loadPendingSession()).resolves.toBeNull();
        });

        it('is null when the stored value is missing a field', async () => {
            const { bellSound: _bellSound, ...partial } = SESSION;
            storeRaw(JSON.stringify(partial));
            await expect(loadPendingSession()).resolves.toBeNull();
        });

        it('is null when the stored value is not an object', async () => {
            storeRaw('42');
            await expect(loadPendingSession()).resolves.toBeNull();
        });
    });
});
