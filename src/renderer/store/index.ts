/**
 * store/index — convenience functions delegating to the active storage adapter.
 * Owns: re-exports, thin async wrappers for each storage operation.
 * Does NOT own: adapter selection (factory.ts), type definitions (types.ts).
 */
import { getAdapter, checkAvailability } from '@/renderer/store/adapters/factory';
import type {
    DateRangeQuery,
    EightfoldPathAnalytics,
    EightfoldPathLog,
    Emotion,
    EmotionAnalytics,
    EmotionLog,
    IStorageAdapter,
    Language,
    Meditation,
    PathItem,
    Settings,
    Theme,
} from '@/renderer/store/types';

// Re-export types
export * from '@/renderer/store/types';

export async function checkStorageAvailability(): Promise<{ server: boolean; local: boolean }> {
    return checkAvailability();
}

// Vault operations
export async function findVaultPath(): Promise<string | null> {
    const adapter = await getStorageAdapter();
    return adapter.findVaultPath();
}

export async function chooseVault(): Promise<string | null> {
    const adapter = await getStorageAdapter();
    return adapter.chooseVault();
}

export async function closeVault(): Promise<void> {
    const adapter = await getStorageAdapter();
    return adapter.closeVault();
}

/**
 * Named without a `can` prefix on purpose: that prefix promises a pure
 * synchronous predicate, and resolving the adapter is neither.
 */
export async function vaultIsPickable(): Promise<boolean> {
    const adapter = await getStorageAdapter();
    return adapter.canChooseVault();
}

// Settings operations
export async function getSettings(): Promise<Settings> {
    const adapter = await getStorageAdapter();
    return adapter.getSettings();
}

export async function updateTheme(theme: Theme): Promise<Settings> {
    const adapter = await getStorageAdapter();
    return adapter.updateTheme(theme);
}

export async function updateLanguage(language: Language): Promise<Settings> {
    const adapter = await getStorageAdapter();
    return adapter.updateLanguage(language);
}

// Meditation operations
export async function createMeditation(
    date: string,
    duration: number,
    notes: string,
): Promise<{ message: string; meditation: Meditation }> {
    const adapter = await getStorageAdapter();
    return adapter.createMeditation({ date, duration, notes });
}

export async function getMeditations(): Promise<{ meditations: Meditation[] }> {
    const adapter = await getStorageAdapter();
    return adapter.getMeditations();
}

// Emotion operations
export async function saveEmotionLog(
    date: string,
    emotions: Emotion[],
    note?: string,
): Promise<{ message: string; emotionLog: EmotionLog }> {
    const adapter = await getStorageAdapter();
    return adapter.saveEmotionLog({ date, emotions, note });
}

export async function getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
    const adapter = await getStorageAdapter();
    return adapter.getEmotionLogs(query);
}

export async function getEmotionAnalytics(days?: number): Promise<EmotionAnalytics> {
    const adapter = await getStorageAdapter();
    return adapter.getEmotionAnalytics(days);
}

// Eightfold Path operations
export async function saveEightfoldPathLog(
    date: string,
    paths: PathItem[],
): Promise<{ message: string; pathLog: EightfoldPathLog }> {
    const adapter = await getStorageAdapter();
    return adapter.saveEightfoldPathLog({ date, paths });
}

export async function getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
    const adapter = await getStorageAdapter();
    return adapter.getEightfoldPathLogs(query);
}

export async function getEightfoldPathAnalytics(days?: number): Promise<EightfoldPathAnalytics> {
    const adapter = await getStorageAdapter();
    return adapter.getEightfoldPathAnalytics(days);
}

/** The active adapter, resolved on first use. Every wrapper above opens with it. */
async function getStorageAdapter(): Promise<IStorageAdapter> {
    return getAdapter();
}
