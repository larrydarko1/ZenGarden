/**
 * electron — Electron storage adapter bridging Vue to the vault via IPC.
 * Owns: the IStorageAdapter implementation for desktop.
 * Does NOT own: IPC handlers (main/services/), the bridge contract (@/schemas/electron),
 * type definitions (types.ts).
 */
import type {
    IStorageAdapter,
    Settings,
    Theme,
    Language,
    Meditation,
    MeditationInput,
    EmotionLog,
    EmotionLogInput,
    EightfoldPathLog,
    EightfoldPathInput,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery,
} from '@/renderer/store/types';
import type { ElectronAPI } from '@/schemas/electron';
import type { IpcResult } from '@/schemas/storage';

export class ElectronStorageAdapter implements IStorageAdapter {
    private api: ElectronAPI;

    constructor() {
        if (window.electronAPI === undefined) {
            throw new Error('Electron API not available. Make sure preload script is loaded.');
        }
        this.api = window.electronAPI;
    }

    probeAvailability(): Promise<boolean> {
        return Promise.resolve(window.electronAPI !== undefined);
    }

    async findVaultPath(): Promise<string | null> {
        return unwrap(await this.api.findVaultPath());
    }

    async chooseVault(): Promise<string | null> {
        return unwrap(await this.api.chooseVault());
    }

    async closeVault(): Promise<void> {
        unwrap(await this.api.closeVault());
    }

    canChooseVault(): boolean {
        return true;
    }

    async getSettings(): Promise<Settings> {
        return unwrap(await this.api.getSettings());
    }

    async updateTheme(theme: Theme): Promise<Settings> {
        return unwrap(await this.api.updateTheme(theme));
    }

    async updateLanguage(language: Language): Promise<Settings> {
        return unwrap(await this.api.updateLanguage(language));
    }

    async createMeditation(input: MeditationInput): Promise<{ message: string; meditation: Meditation }> {
        const meditation = unwrap(await this.api.createMeditation(input.date, input.duration, input.notes));
        return { message: 'Meditation saved successfully', meditation };
    }

    async getMeditations(): Promise<{ meditations: Meditation[] }> {
        const meditations = unwrap(await this.api.getMeditations());
        return { meditations };
    }

    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        const emotionLog = unwrap(await this.api.saveEmotionLog(input.date, input.emotions, input.note));
        return { message: 'Emotion log saved successfully', emotionLog };
    }

    async getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
        const emotionLogs = unwrap(await this.api.getEmotionLogs(query));
        return { emotionLogs };
    }

    async getEmotionAnalytics(days?: number): Promise<EmotionAnalytics> {
        return unwrap(await this.api.getEmotionAnalytics(days));
    }

    async saveEightfoldPathLog(input: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }> {
        const pathLog = unwrap(await this.api.saveEightfoldPathLog(input.date, input.paths));
        return { message: 'Eightfold path log saved successfully', pathLog };
    }

    async getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
        const pathLogs = unwrap(await this.api.getEightfoldPathLogs(query));
        return { pathLogs };
    }

    async getEightfoldPathAnalytics(days?: number): Promise<EightfoldPathAnalytics> {
        return unwrap(await this.api.getEightfoldPathAnalytics(days));
    }
}

/**
 * Turn a handler's failure envelope back into a throw.
 * The main process reports failures as data so the message survives the bridge
 * intact. `IStorageAdapter` is a throwing contract, and the Capacitor adapter
 * throws, so the unwrapping happens here — once — rather than in every caller.
 */
function unwrap<T>(result: IpcResult<T>): T {
    if (!result.success) throw new Error(result.error);
    return result.data;
}

declare global {
    // Must be an interface, not a type: this merges with the DOM's own Window declaration.
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
