import { describe, it, expect, beforeEach } from 'vitest';

import { isDesktop } from '@/renderer/utils/platform';

/** Puts `api` where the preload would, whatever its shape — that is what is under test. */
function exposeBridge(api: unknown): void {
    Reflect.set(window, 'electronAPI', api);
}

describe('platform utilities', () => {
    beforeEach(() => {
        Reflect.deleteProperty(window, 'electronAPI');
    });

    describe('isDesktop', () => {
        it('returns false when electronAPI is not on window', () => {
            expect(isDesktop()).toBe(false);
        });

        it('returns false when electronAPI exists but isElectron is missing', () => {
            exposeBridge({});
            expect(isDesktop()).toBe(false);
        });

        it('returns true when electronAPI.isElectron() returns true', () => {
            exposeBridge({ isElectron: () => true });
            expect(isDesktop()).toBe(true);
        });

        it('returns false when electronAPI.isElectron() returns false', () => {
            exposeBridge({ isElectron: () => false });
            expect(isDesktop()).toBe(false);
        });
    });
});
