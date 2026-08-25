/**
 * types — the storage layer's renderer-side contract.
 * Owns: IStorageAdapter, and the re-export that lets renderer code keep importing
 * every storage type from one module.
 * Does NOT own: the wire types themselves (@/schemas/storage), implementations (adapters/).
 */
import type {
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
} from '@/schemas/storage';

export type * from '@/schemas/storage';

export type IStorageAdapter = {
    // Mode detection
    probeAvailability(): Promise<boolean>;

    // Auth
    register(credentials: UserCredentials, options?: { theme?: string; language?: string }): Promise<AuthResponse>;
    login(credentials: UserCredentials): Promise<AuthResponse>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<{ user: User }>;

    // User Management
    updateUsername(
        newUsername: string,
        password: string,
    ): Promise<{ message: string; username: string; token: string }>;
    updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }>;
    deleteAccount(password: string): Promise<{ message: string }>;

    // Settings
    updateTheme(theme: User['theme']): Promise<{ message: string; theme: User['theme'] }>;
    updateLanguage(language: User['language']): Promise<{ message: string; language: User['language'] }>;

    // Meditations
    createMeditation(meditation: MeditationInput): Promise<{ message: string; meditation: Meditation }>;
    getMeditations(): Promise<{ meditations: Meditation[] }>;

    // Emotions
    saveEmotionLog(log: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }>;
    getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }>;
    getEmotionAnalytics(days?: number): Promise<EmotionAnalytics>;

    // Eightfold Path
    saveEightfoldPathLog(log: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }>;
    getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }>;
    getEightfoldPathAnalytics(days?: number): Promise<EightfoldPathAnalytics>;

    // Recovery Codes
    getRecoveryStatus(): Promise<RecoveryStatus>;
    generateRecoveryCodes(password: string): Promise<{ codes: string[] }>;
    resetPasswordWithRecoveryCode(username: string, code: string, newPassword: string): Promise<{ message: string }>;

    // Data Export/Import (for local mode backup)
    exportData?(): Promise<string>;
    importData?(data: string): Promise<{ message: string }>;
};
