// electron — Electron storage adapter bridging Vue to Node.js JSON file backend via IPC.
// Owns: ElectronAPI interface, IStorageAdapter implementation for desktop.
// Does NOT own: IPC handlers (main/services/), type definitions (types.ts).

import type {
    IStorageAdapter,
    User,
    UserCredentials,
    AuthResponse,
    Meditation,
    MeditationInput,
    Emotion,
    EmotionLog,
    EmotionLogInput,
    PathItem,
    EightfoldPathLog,
    EightfoldPathInput,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery,
    RecoveryStatus,
} from '../types';

// Type definition for the Electron API exposed by preload script
interface ElectronAPI {
    register: (username: string, password: string, theme?: string, language?: string) => Promise<AuthResponse>;
    login: (username: string, password: string) => Promise<AuthResponse>;
    logout: () => Promise<{ message: string }>;
    getCurrentUser: () => Promise<User | null>;
    updateUsername: (newUsername: string, password: string) => Promise<{ message: string }>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<{ message: string }>;
    deleteAccount: (password: string) => Promise<{ message: string }>;
    updateTheme: (theme: string) => Promise<{ message: string }>;
    updateLanguage: (language: string) => Promise<{ message: string }>;
    createMeditation: (date: string, duration: number, notes: string) => Promise<Meditation>;
    getMeditations: () => Promise<Meditation[]>;
    saveEmotionLog: (date: string, emotions: Emotion[], note?: string) => Promise<EmotionLog>;
    getEmotionLogs: (query?: DateRangeQuery) => Promise<EmotionLog[]>;
    getEmotionAnalytics: (days?: number) => Promise<EmotionAnalytics>;
    saveEightfoldPathLog: (date: string, paths: PathItem[]) => Promise<EightfoldPathLog>;
    getEightfoldPathLogs: (query?: DateRangeQuery) => Promise<EightfoldPathLog[]>;
    getEightfoldPathAnalytics: (days?: number) => Promise<EightfoldPathAnalytics>;
    getRecoveryStatus: () => Promise<RecoveryStatus>;
    generateRecoveryCodes: (password: string) => Promise<{ codes: string[] }>;
    resetPasswordWithRecoveryCode: (
        username: string,
        code: string,
        newPassword: string,
    ) => Promise<{ message: string }>;
    isElectron: () => boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export class ElectronStorageAdapter implements IStorageAdapter {
    private api: ElectronAPI;

    constructor() {
        if (!window.electronAPI) {
            throw new Error('Electron API not available. Make sure preload script is loaded.');
        }
        this.api = window.electronAPI;
    }

    async isAvailable(): Promise<boolean> {
        return !!window.electronAPI;
    }

    // ─── Auth ─────────────────────────────────────────────────────────────────
    async register(
        credentials: UserCredentials,
        theme?: 'light' | 'dark',
        language?: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja',
    ): Promise<AuthResponse> {
        return this.api.register(credentials.username, credentials.password, theme, language);
    }

    async login(credentials: UserCredentials): Promise<AuthResponse> {
        return this.api.login(credentials.username, credentials.password);
    }

    async logout(): Promise<void> {
        await this.api.logout();
    }

    async getCurrentUser(): Promise<{ user: User }> {
        const user = await this.api.getCurrentUser();
        if (!user) throw new Error('Not authenticated');
        return { user };
    }

    async updateUsername(
        newUsername: string,
        password: string,
    ): Promise<{ message: string; username: string; token: string }> {
        const result = await this.api.updateUsername(newUsername, password);
        return { ...result, username: newUsername, token: '' };
    }

    async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        return this.api.updatePassword(currentPassword, newPassword);
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        return this.api.deleteAccount(password);
    }

    // ─── Settings ────────────────────────────────────────────────────────────
    async updateTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: 'light' | 'dark' }> {
        const result = await this.api.updateTheme(theme);
        return { ...result, theme };
    }

    async updateLanguage(
        language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja',
    ): Promise<{ message: string; language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' }> {
        const result = await this.api.updateLanguage(language);
        return { ...result, language };
    }

    // ─── Meditations ─────────────────────────────────────────────────────────
    async createMeditation(input: MeditationInput): Promise<{ message: string; meditation: Meditation }> {
        const meditation = await this.api.createMeditation(input.date, input.duration, input.notes);
        return { message: 'Meditation saved successfully', meditation };
    }

    async getMeditations(): Promise<{ meditations: Meditation[] }> {
        const meditations = await this.api.getMeditations();
        return { meditations };
    }

    // ─── Emotions ────────────────────────────────────────────────────────────
    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        const emotionLog = await this.api.saveEmotionLog(input.date, input.emotions, input.note);
        return { message: 'Emotion log saved successfully', emotionLog };
    }

    async getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
        const emotionLogs = await this.api.getEmotionLogs(query);
        return { emotionLogs };
    }

    async getEmotionAnalytics(days?: number): Promise<EmotionAnalytics> {
        return this.api.getEmotionAnalytics(days);
    }

    // ─── Eightfold path ──────────────────────────────────────────────────────
    async saveEightfoldPathLog(input: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }> {
        const pathLog = await this.api.saveEightfoldPathLog(input.date, input.paths);
        return { message: 'Eightfold path log saved successfully', pathLog };
    }

    async getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
        const pathLogs = await this.api.getEightfoldPathLogs(query);
        return { pathLogs };
    }

    async getEightfoldPathAnalytics(days?: number): Promise<EightfoldPathAnalytics> {
        return this.api.getEightfoldPathAnalytics(days);
    }

    // ─── Recovery codes ─────────────────────────────────────────────────────
    async getRecoveryStatus(): Promise<RecoveryStatus> {
        return this.api.getRecoveryStatus();
    }

    async generateRecoveryCodes(password: string): Promise<{ codes: string[] }> {
        return this.api.generateRecoveryCodes(password);
    }

    async resetPasswordWithRecoveryCode(
        username: string,
        code: string,
        newPassword: string,
    ): Promise<{ message: string }> {
        return this.api.resetPasswordWithRecoveryCode(username, code, newPassword);
    }
}
