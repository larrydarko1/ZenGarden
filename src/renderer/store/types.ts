/**
 * types — shared TypeScript interfaces for the storage layer.
 * Owns: all type/interface definitions consumed by adapters, composables, and components.
 * Does NOT own: implementation logic (adapters/), persistence (db.ts).
 */

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
    username: string;
    theme: 'light' | 'dark';
    language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';
}

export interface UserCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    user: User;
    token: string;
}

// Meditation Types
export interface Meditation {
    _id?: string;
    username: string;
    date: Date | string;
    duration: number;
    notes: string;
}

export interface MeditationInput {
    date: string;
    duration: number;
    notes: string;
}

// Emotion Types
export interface Emotion {
    name: string;
    type: 'positive' | 'negative';
}

export interface EmotionLog {
    _id?: string;
    username: string;
    date: Date | string;
    emotions: Emotion[];
    positiveCount: number;
    negativeCount: number;
    pnRatio: number;
    note?: string;
    updatedAt: Date | string;
}

export interface EmotionLogInput {
    date: string;
    emotions: Emotion[];
    note?: string;
}

// Eightfold Path Types
export interface PathItem {
    path: string;
    note: string;
}

export interface EightfoldPathLog {
    _id?: string;
    username: string;
    date: Date | string;
    paths: PathItem[];
    completedCount: number;
    progressPercentage: number;
    updatedAt: Date | string;
}

export interface EightfoldPathInput {
    date: string;
    paths: PathItem[];
}

// Analytics Types
export interface EmotionStat {
    name: string;
    count: number;
    type: string;
}

export interface EmotionAnalytics {
    totalDays: number;
    averagePositiveCount: number;
    averageNegativeCount: number;
    averagePNRatio: number;
    emotionDiversity: number;
    positiveDays: number;
    negativeDays: number;
    topEmotions: EmotionStat[];
    trends: { date: string; pnRatio: number }[];
}

export interface EightfoldPathAnalytics {
    totalDays: number;
    averageCompletion: number;
    perfectDays: number;
    mostFollowedPaths: { path: string; count: number }[];
    trends: { date: string; completedCount: number }[];
}

// Query Types
export interface DateRangeQuery {
    startDate?: string;
    endDate?: string;
    limit?: number;
}

// Recovery Types
export interface RecoveryStatus {
    hasRecoveryCodes: boolean;
    totalCodes: number;
    usedCodes: number;
    remainingCodes: number;
}

// Storage Adapter Interface
export interface IStorageAdapter {
    // Mode detection
    isAvailable(): Promise<boolean>;

    // Auth
    register(credentials: UserCredentials, theme?: string, language?: string): Promise<AuthResponse>;
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
}
