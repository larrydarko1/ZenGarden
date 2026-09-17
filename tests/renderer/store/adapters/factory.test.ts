import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockElectronAvailable, mockCapacitorAvailable } = vi.hoisted(() => ({
    mockElectronAvailable: vi.fn<() => Promise<boolean>>(),
    mockCapacitorAvailable: vi.fn<() => Promise<boolean>>(),
}));

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

const loadFactory = () => import('@/renderer/store/adapters/factory');

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
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });

        it('starts from an empty cache in a freshly loaded module', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const { getAdapter } = await loadFactory();

            await getAdapter();
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });
    });
});
