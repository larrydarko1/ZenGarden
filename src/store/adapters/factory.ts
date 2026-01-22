// Storage Adapter Factory - Electron-only (Desktop App)
import type { IStorageAdapter, StorageMode } from '../types';
import { ElectronStorageAdapter } from './electron';

export class StorageFactory {
    private static instance: IStorageAdapter | null = null;
    private static mode: StorageMode = 'local';

    /**
     * Get the Electron storage adapter (JSON files)
     */
    static async getAdapter(): Promise<IStorageAdapter> {
        // Return cached instance if available
        if (this.instance) {
            return this.instance;
        }

        // Use Electron adapter only
        const electronAdapter = new ElectronStorageAdapter();

        if (await electronAdapter.isAvailable()) {
            this.instance = electronAdapter;
            console.log('🖥️  Zen Garden: Desktop app with JSON storage');
            return electronAdapter;
        }

        throw new Error('This app requires Electron. Please run as desktop application.');
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
        const electronAdapter = new ElectronStorageAdapter();
        const local = await electronAdapter.isAvailable();

        return { server: false, local };
    }

    /**
     * Reset factory (useful for testing)
     */
    static reset(): void {
        this.instance = null;
    }
}
