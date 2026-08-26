// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// `vi.mock` is hoisted above these declarations, so the factories below cannot close
// over a plain `const` — under Vitest 4 the factory runs before the const exists and the
// mock silently falls back to the real module. `vi.hoisted` lifts them with the mocks.
const { mockElectronAvailable, mockCapacitorAvailable } = vi.hoisted(() => ({
    mockElectronAvailable: vi.fn<() => Promise<boolean>>(),
    mockCapacitorAvailable: vi.fn<() => Promise<boolean>>(),
}));

// The implementations are `function` expressions, not arrows: the factory calls
// `new ElectronStorageAdapter()`, and an arrow cannot be constructed. Under Vitest 4
// that throws inside the factory's `try`, which swallows it and reports "no adapter
// available" — a mock failure wearing the costume of a real one.
vi.mock('@/renderer/store/adapters/electron', () => ({
    ElectronStorageAdapter: vi.fn(function () {
        return { probeAvailability: mockElectronAvailable };
    }),
}));

vi.mock('@/renderer/store/adapters/capacitor', () => ({
    CapacitorStorageAdapter: vi.fn(function () {
        return { probeAvailability: mockCapacitorAvailable };
    }),
}));

import { getAdapter, checkAvailability, resetAdapter } from '@/renderer/store/adapters/factory';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageFactory', () => {
    beforeEach(() => {
        resetAdapter();
        vi.clearAllMocks();
    });

    describe('getAdapter', () => {
        it('returns ElectronStorageAdapter when Electron is available', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const adapter = await getAdapter();
            expect(adapter).toBeDefined();
            expect(adapter.probeAvailability).toBe(mockElectronAvailable);
        });

        it('falls back to CapacitorStorageAdapter when Electron is unavailable', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(true);
            const adapter = await getAdapter();
            expect(adapter.probeAvailability).toBe(mockCapacitorAvailable);
        });

        it('throws when neither adapter is available', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(false);
            await expect(getAdapter()).rejects.toThrow('No storage adapter available');
        });

        it('caches the adapter on subsequent calls', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const first = await getAdapter();
            const second = await getAdapter();
            expect(first).toBe(second);
            // probeAvailability called only once because second call returns cache
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });
    });

    describe('checkAvailability', () => {
        it('returns local: true when Electron is available', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const res = await checkAvailability();
            expect(res).toEqual({ server: false, local: true });
        });

        it('returns local: true when Capacitor is available', async () => {
            mockElectronAvailable.mockRejectedValue(new Error('no electron'));
            mockCapacitorAvailable.mockResolvedValue(true);
            const res = await checkAvailability();
            expect(res).toEqual({ server: false, local: true });
        });

        it('returns local: false when neither is available', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(false);
            const res = await checkAvailability();
            expect(res).toEqual({ server: false, local: false });
        });
    });

    describe('reset', () => {
        it('clears the cached adapter', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            await getAdapter();
            resetAdapter();
            await getAdapter();
            // probeAvailability called twice because cache was cleared
            expect(mockElectronAvailable).toHaveBeenCalledTimes(2);
        });
    });
});
