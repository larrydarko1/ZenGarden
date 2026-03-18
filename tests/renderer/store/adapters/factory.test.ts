// @vitest-environment jsdom

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockElectronAvailable = vi.fn<() => Promise<boolean>>();
const mockCapacitorAvailable = vi.fn<() => Promise<boolean>>();

vi.mock('../../../../src/renderer/store/adapters/electron', () => ({
    ElectronStorageAdapter: vi.fn().mockImplementation(() => ({
        isAvailable: mockElectronAvailable,
    })),
}));

vi.mock('../../../../src/renderer/store/adapters/capacitor', () => ({
    CapacitorStorageAdapter: vi.fn().mockImplementation(() => ({
        isAvailable: mockCapacitorAvailable,
    })),
}));

import { StorageFactory } from '../../../../src/renderer/store/adapters/factory';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageFactory', () => {
    beforeEach(() => {
        StorageFactory.reset();
        vi.clearAllMocks();
    });

    describe('getAdapter', () => {
        it('returns ElectronStorageAdapter when Electron is available', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const adapter = await StorageFactory.getAdapter();
            expect(adapter).toBeDefined();
            expect(adapter.isAvailable).toBe(mockElectronAvailable);
        });

        it('falls back to CapacitorStorageAdapter when Electron is unavailable', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(true);
            const adapter = await StorageFactory.getAdapter();
            expect(adapter.isAvailable).toBe(mockCapacitorAvailable);
        });

        it('throws when neither adapter is available', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(false);
            await expect(StorageFactory.getAdapter()).rejects.toThrow('No storage adapter available');
        });

        it('caches the adapter on subsequent calls', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const first = await StorageFactory.getAdapter();
            const second = await StorageFactory.getAdapter();
            expect(first).toBe(second);
            // isAvailable called only once because second call returns cache
            expect(mockElectronAvailable).toHaveBeenCalledTimes(1);
        });
    });

    describe('checkAvailability', () => {
        it('returns local: true when Electron is available', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            const res = await StorageFactory.checkAvailability();
            expect(res).toEqual({ server: false, local: true });
        });

        it('returns local: true when Capacitor is available', async () => {
            mockElectronAvailable.mockRejectedValue(new Error('no electron'));
            mockCapacitorAvailable.mockResolvedValue(true);
            const res = await StorageFactory.checkAvailability();
            expect(res).toEqual({ server: false, local: true });
        });

        it('returns local: false when neither is available', async () => {
            mockElectronAvailable.mockResolvedValue(false);
            mockCapacitorAvailable.mockResolvedValue(false);
            const res = await StorageFactory.checkAvailability();
            expect(res).toEqual({ server: false, local: false });
        });
    });

    describe('reset', () => {
        it('clears the cached adapter', async () => {
            mockElectronAvailable.mockResolvedValue(true);
            await StorageFactory.getAdapter();
            StorageFactory.reset();
            await StorageFactory.getAdapter();
            // isAvailable called twice because cache was cleared
            expect(mockElectronAvailable).toHaveBeenCalledTimes(2);
        });
    });
});
