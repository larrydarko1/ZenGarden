import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isElectron, isDesktop, isWeb, isMobile, getPlatform } from '../../../src/renderer/utils/platform';

// Helper to set/delete properties on window in tests
const win = window as unknown as Record<string, unknown>;

describe('platform utilities', () => {
    beforeEach(() => {
        // Reset electronAPI on window between tests
        delete win['electronAPI'];
    });

    // ─── isElectron ───────────────────────────────────────────────────────

    describe('isElectron', () => {
        it('returns false when electronAPI is not on window', () => {
            expect(isElectron()).toBe(false);
        });

        it('returns false when electronAPI exists but isElectron is missing', () => {
            win['electronAPI'] = {};
            expect(isElectron()).toBe(false);
        });

        it('returns true when electronAPI.isElectron() returns true', () => {
            win['electronAPI'] = { isElectron: () => true };
            expect(isElectron()).toBe(true);
        });

        it('returns false when electronAPI.isElectron() returns false', () => {
            win['electronAPI'] = { isElectron: () => false };
            expect(isElectron()).toBe(false);
        });
    });

    // ─── isDesktop ────────────────────────────────────────────────────────

    describe('isDesktop', () => {
        it('delegates to isElectron', () => {
            expect(isDesktop()).toBe(false);
            win['electronAPI'] = { isElectron: () => true };
            expect(isDesktop()).toBe(true);
        });
    });

    // ─── isWeb ────────────────────────────────────────────────────────────

    describe('isWeb', () => {
        it('returns true when not in Electron', () => {
            expect(isWeb()).toBe(true);
        });

        it('returns false when in Electron', () => {
            win['electronAPI'] = { isElectron: () => true };
            expect(isWeb()).toBe(false);
        });
    });

    // ─── isMobile ─────────────────────────────────────────────────────────

    describe('isMobile', () => {
        it('returns false for a standard desktop user-agent', () => {
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
            expect(isMobile()).toBe(false);
        });

        it.each(['Android', 'iPhone', 'iPad', 'iPod'])('returns true for %s user-agent', (device) => {
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 (${device})`);
            expect(isMobile()).toBe(true);
        });
    });

    // ─── getPlatform ──────────────────────────────────────────────────────

    describe('getPlatform', () => {
        it('returns "web" when not Electron and not mobile', () => {
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64)');
            expect(getPlatform()).toBe('web');
        });

        it('returns "mobile" for a mobile user-agent when not Electron', () => {
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS)');
            expect(getPlatform()).toBe('mobile');
        });

        it('returns "darwin" in Electron with a Mac user-agent', () => {
            win['electronAPI'] = { isElectron: () => true };
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
            expect(getPlatform()).toBe('darwin');
        });

        it('returns "win32" in Electron with a Windows user-agent', () => {
            win['electronAPI'] = { isElectron: () => true };
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64)');
            expect(getPlatform()).toBe('win32');
        });

        it('returns "linux" in Electron with a Linux user-agent', () => {
            win['electronAPI'] = { isElectron: () => true };
            vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64)');
            expect(getPlatform()).toBe('linux');
        });
    });
});
