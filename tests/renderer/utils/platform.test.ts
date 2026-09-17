import { describe, it, expect, beforeEach } from 'vitest';
import { isDesktop } from '@/renderer/utils/platform';

// Helper to set/delete properties on window in tests
const win = window as unknown as Record<string, unknown>;

describe('platform utilities', () => {
    beforeEach(() => {
        // Reset electronAPI on window between tests
        delete win['electronAPI'];
    });

    describe('isDesktop', () => {
        it('returns false when electronAPI is not on window', () => {
            expect(isDesktop()).toBe(false);
        });

        it('returns false when electronAPI exists but isElectron is missing', () => {
            win['electronAPI'] = {};
            expect(isDesktop()).toBe(false);
        });

        it('returns true when electronAPI.isElectron() returns true', () => {
            win['electronAPI'] = { isElectron: () => true };
            expect(isDesktop()).toBe(true);
        });

        it('returns false when electronAPI.isElectron() returns false', () => {
            win['electronAPI'] = { isElectron: () => false };
            expect(isDesktop()).toBe(false);
        });
    });
});
