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

/**
 * The factory caches its adapter in a module-level singleton, so every test needs a
 * module that has never resolved one. `vi.resetModules()` in `beforeEach` drops the
 * registry and this dynamic import rebuilds it — the mocks above still apply. A
 * `resetAdapter()` export would do the same job, but only production code belongs in
 * production modules; the hoisted consts survive the reset, being outside the registry.
 */
const loadFactory = () => import('@/renderer/store/adapters/factory');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageFactory', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    describe('getAdapter', () => {
        it('returns ElectronStorageAdapter when Electron is available', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const { getAdapter } = await loadFactory();

            const adapter = await getAdapter();
            expect(adapter).toBeDefined();
            expect(adapter.probeAvailability).toBe(mockElectronAvailable);
        });

        it('falls back to CapacitorStorageAdapter when Electron is unavailable', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(true);
            const { getAdapter } = await loadFactory();

            const adapter = await getAdapter();
            expect(adapter.probeAvailability).toBe(mockCapacitorAvailable);
        });

        it('throws when neither adapter is available', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(false);
            const { getAdapter } = await loadFactory();

            await expect(getAdapter()).rejects.toThrow('No storage adapter available');
        });

        it('caches the adapter on subsequent calls', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const { getAdapter } = await loadFactory();

            const first = await getAdapter();
            const second = await getAdapter();
            expect(first).toBe(second);
            // probeAvailability called only once because second call returns cache
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });

        it('starts from an empty cache in a freshly loaded module', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const { getAdapter } = await loadFactory();

            // The previous test already resolved an adapter; this module is a new one,
            // so it has to probe again rather than hand back that instance.
            await getAdapter();
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });
    });
});
