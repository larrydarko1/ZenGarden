/**
 * types — the storage layer's renderer-side contract.
 * Owns: IStorageAdapter, and the re-export that lets renderer code keep importing
 * every storage type from one module.
 * Does NOT own: the wire types themselves (@/schemas/storage), implementations (adapters/).
 */
import type {
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
} from '@/schemas/storage';

export type * from '@/schemas/storage';

export type IStorageAdapter = {
    // Mode detection
    probeAvailability(): Promise<boolean>;

    // Vault
    /** The open vault's location, or null when none is open. */
    findVaultPath(): Promise<string | null>;
    /** Opens the picker and returns the chosen folder, or null if it was cancelled. */
    chooseVault(): Promise<string | null>;
    closeVault(): Promise<void>;
    /**
     * Whether the vault is the user's to choose. False on Android, where the
     * vault is a fixed folder in Documents and the UI has no picker to offer.
     */
    canChooseVault(): boolean;

    // Settings
    getSettings(): Promise<Settings>;
    updateTheme(theme: Theme): Promise<Settings>;
    updateLanguage(language: Language): Promise<Settings>;

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
};
