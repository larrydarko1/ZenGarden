/**
 * factory — auto-detects Electron (desktop) or Capacitor (mobile) and caches the adapter.
 * Owns: adapter instantiation, availability probing, singleton cache.
 * Does NOT own: adapter implementations (electron.ts, capacitor.ts), types (types.ts).
 */

import type { IStorageAdapter } from '@/renderer/store/types';
import { ElectronStorageAdapter } from '@/renderer/store/adapters/electron';
import { CapacitorStorageAdapter } from '@/renderer/store/adapters/capacitor';

let instance: IStorageAdapter | null = null;

/** Returns the adapter for the current platform, instantiating and caching it on first call. */
export async function getAdapter(): Promise<IStorageAdapter> {
    if (instance !== null) {
        return instance;
    }

    // Try Electron first (desktop app)
    try {
        const electronAdapter = new ElectronStorageAdapter();
        if (await electronAdapter.probeAvailability()) {
            instance = electronAdapter;
            return electronAdapter;
        }
    } catch {
        // Electron not available (e.g., running on mobile)
    }

    // Fall back to Capacitor (mobile app)
    try {
        const capacitorAdapter = new CapacitorStorageAdapter();
        if (await capacitorAdapter.probeAvailability()) {
            instance = capacitorAdapter;
            return capacitorAdapter;
        }
    } catch {
        // Capacitor not available
    }

    throw new Error('No storage adapter available. This app requires Electron (desktop) or Capacitor (mobile).');
}
