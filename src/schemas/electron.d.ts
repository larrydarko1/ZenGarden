/**
 * electron — the contextBridge contract.
 * Owns: the shape of `window.electronAPI`, as one declaration.
 * Does NOT own: the wire types it is built from (@/schemas/storage), the
 * handlers behind it (main/services/), the bridge itself (preload/index.ts).
 * Both ends annotate against this: the preload's exposed object and the
 * renderer's `window.electronAPI`. That is what stops the two from drifting —
 * a renamed method fails the type check instead of at the first click.
 */

import type {
    IpcResult,
    User,
    AuthResponse,
    Meditation,
    Emotion,
    EmotionLog,
    PathItem,
    EightfoldPathLog,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery,
    RecoveryStatus,
} from '@/schemas/storage';

/**
 * Every channel but `isElectron` answers with an IpcResult: the handlers report
 * failure as data rather than throwing across the bridge. The renderer's adapter
 * is where that becomes a throw again.
 */
export type ElectronAPI = {
    isElectron: () => boolean;

    register: (
        username: string,
        password: string,
        options?: { theme?: string; language?: string },
    ) => Promise<IpcResult<AuthResponse>>;
    login: (username: string, password: string) => Promise<IpcResult<AuthResponse>>;
    logout: () => Promise<IpcResult<{ message: string }>>;
    getCurrentUser: () => Promise<IpcResult<User | null>>;
    updateUsername: (newUsername: string, password: string) => Promise<IpcResult<{ message: string }>>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<IpcResult<{ message: string }>>;
    deleteAccount: (password: string) => Promise<IpcResult<{ message: string }>>;

    updateTheme: (theme: string) => Promise<IpcResult<{ message: string }>>;
    updateLanguage: (language: string) => Promise<IpcResult<{ message: string }>>;

    createMeditation: (date: string, duration: number, notes: string) => Promise<IpcResult<Meditation>>;
    getMeditations: () => Promise<IpcResult<Meditation[]>>;

    saveEmotionLog: (date: string, emotions: Emotion[], note?: string) => Promise<IpcResult<EmotionLog>>;
    getEmotionLogs: (query?: DateRangeQuery) => Promise<IpcResult<EmotionLog[]>>;
    getEmotionAnalytics: (days?: number) => Promise<IpcResult<EmotionAnalytics>>;

    saveEightfoldPathLog: (date: string, paths: PathItem[]) => Promise<IpcResult<EightfoldPathLog>>;
    getEightfoldPathLogs: (query?: DateRangeQuery) => Promise<IpcResult<EightfoldPathLog[]>>;
    getEightfoldPathAnalytics: (days?: number) => Promise<IpcResult<EightfoldPathAnalytics>>;

    getRecoveryStatus: () => Promise<IpcResult<RecoveryStatus>>;
    generateRecoveryCodes: (password: string) => Promise<IpcResult<{ codes: string[] }>>;
    resetPasswordWithRecoveryCode: (
        username: string,
        code: string,
        newPassword: string,
    ) => Promise<IpcResult<{ message: string }>>;
};
