/**
 * factory — auto-detects Electron (desktop) or Capacitor (mobile) and caches the adapter.
 * Owns: adapter instantiation, availability probing, singleton cache.
 * Does NOT own: adapter implementations (electron.ts, capacitor.ts), types (types.ts).
 */

import type { IStorageAdapter } from '../types';
import { ElectronStorageAdapter } from './electron';
import { CapacitorStorageAdapter } from './capacitor';

export class StorageFactory {
    private static instance: IStorageAdapter | null = null;

    // Return the appropriate adapter (Electron for desktop, Capacitor for mobile)
    static async getAdapter(): Promise<IStorageAdapter> {
        // Return cached instance if available
        if (this.instance) {
            return this.instance;
        }

        // Try Electron first (desktop app)
        try {
            const electronAdapter = new ElectronStorageAdapter();
            if (await electronAdapter.isAvailable()) {
                this.instance = electronAdapter;
                return electronAdapter;
            }
        } catch {
            // Electron not available (e.g., running on mobile)
        }

        // Fall back to Capacitor (mobile app)
        try {
            const capacitorAdapter = new CapacitorStorageAdapter();
            if (await capacitorAdapter.isAvailable()) {
                this.instance = capacitorAdapter;
                return capacitorAdapter;
            }
        } catch {
            // Capacitor not available
        }

        throw new Error('No storage adapter available. This app requires Electron (desktop) or Capacitor (mobile).');
    }

    // Check availability (always returns local: true, server: false)
    static async checkAvailability(): Promise<{ server: boolean; local: boolean }> {
        let local = false;
        try {
            const electronAdapter = new ElectronStorageAdapter();
            local = await electronAdapter.isAvailable();
        } catch {
            // Electron not available, try Capacitor
            try {
                const capacitorAdapter = new CapacitorStorageAdapter();
                local = await capacitorAdapter.isAvailable();
            } catch {
                // Neither available
            }
        }

        return { server: false, local };
    }

    // Reset factory (useful for testing)
    static reset(): void {
        this.instance = null;
    }
}
