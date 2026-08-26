/**
 * electron — Electron storage adapter bridging Vue to Node.js JSON file backend via IPC.
 * Owns: the IStorageAdapter implementation for desktop.
 * Does NOT own: IPC handlers (main/services/), the bridge contract (@/schemas/electron),
 * type definitions (types.ts).
 */
import type {
    IStorageAdapter,
    User,
    UserCredentials,
    AuthResponse,
    Meditation,
    MeditationInput,
    EmotionLog,
    EmotionLogInput,
    EightfoldPathLog,
    EightfoldPathInput,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery,
    RecoveryStatus,
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

    async register(
        credentials: UserCredentials,
        options: { theme?: 'light' | 'dark'; language?: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' } = {},
    ): Promise<AuthResponse> {
        return unwrap(await this.api.register(credentials.username, credentials.password, options));
    }

    async login(credentials: UserCredentials): Promise<AuthResponse> {
        return unwrap(await this.api.login(credentials.username, credentials.password));
    }

    async logout(): Promise<void> {
        unwrap(await this.api.logout());
    }

    async getCurrentUser(): Promise<{ user: User }> {
        const user = unwrap(await this.api.getCurrentUser());
        if (user === null) throw new Error('Not authenticated');
        return { user };
    }

    async updateUsername(
        newUsername: string,
        password: string,
    ): Promise<{ message: string; username: string; token: string }> {
        const result = unwrap(await this.api.updateUsername(newUsername, password));
        return { ...result, username: newUsername, token: '' };
    }

    async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        return unwrap(await this.api.updatePassword(currentPassword, newPassword));
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        return unwrap(await this.api.deleteAccount(password));
    }

    async updateTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: 'light' | 'dark' }> {
        const result = unwrap(await this.api.updateTheme(theme));
        return { ...result, theme };
    }

    async updateLanguage(
        language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja',
    ): Promise<{ message: string; language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' }> {
        const result = unwrap(await this.api.updateLanguage(language));
        return { ...result, language };
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

    async getRecoveryStatus(): Promise<RecoveryStatus> {
        return unwrap(await this.api.getRecoveryStatus());
    }

    async generateRecoveryCodes(password: string): Promise<{ codes: string[] }> {
        return unwrap(await this.api.generateRecoveryCodes(password));
    }

    async resetPasswordWithRecoveryCode(
        username: string,
        code: string,
        newPassword: string,
    ): Promise<{ message: string }> {
        return unwrap(await this.api.resetPasswordWithRecoveryCode(username, code, newPassword));
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
