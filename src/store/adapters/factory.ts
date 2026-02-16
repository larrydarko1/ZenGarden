// Storage Adapter Factory - Auto-detect Desktop (Electron) or Mobile (Capacitor)
import type { IStorageAdapter, StorageMode } from '../types';
import { ElectronStorageAdapter } from './electron';
import { CapacitorStorageAdapter } from './capacitor';

export class StorageFactory {
    private static instance: IStorageAdapter | null = null;
    private static mode: StorageMode = 'local';

    /**
     * Get the appropriate storage adapter (Electron for desktop, Capacitor for mobile)
     * Both use local JSON file storage with MongoDB-compatible structure
     */
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
                console.log('🖥️  Desktop mode: JSON storage via Electron');
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
                console.log('📱 Mobile mode: JSON storage via Capacitor');
                return capacitorAdapter;
            }
        } catch {
            // Capacitor not available
        }

        throw new Error('No storage adapter available. This app requires Electron (desktop) or Capacitor (mobile).');
    }

    /**
     * Get current storage mode (always 'local')
     */
    static getMode(): StorageMode {
        return this.mode;
    }

    /**
     * Switch storage mode (no-op in local-only mode)
     */
    static async switchMode(mode: StorageMode): Promise<void> {
        if (mode !== 'local') {
            throw new Error('Only local mode is supported in this version. Server mode has been removed.');
        }
        console.log('✅ Already running in LOCAL mode');
    }

    /**
     * Check availability (always returns local: true, server: false)
     */
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

    /**
     * Reset factory (useful for testing)
     */
    static reset(): void {
        this.instance = null;
    }
}
