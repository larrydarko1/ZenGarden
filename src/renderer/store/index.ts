/**
 * store/index — convenience functions delegating to the active storage adapter.
 * Owns: re-exports, thin async wrappers for each storage operation.
 * Does NOT own: adapter selection (factory.ts), type definitions (types.ts).
 */
import { getAdapter, checkAvailability } from '@/renderer/store/adapters/factory';
import type {
    AuthResponse,
    DateRangeQuery,
    EightfoldPathAnalytics,
    EightfoldPathLog,
    Emotion,
    EmotionAnalytics,
    EmotionLog,
    IStorageAdapter,
    Meditation,
    PathItem,
    RecoveryStatus,
    User,
} from '@/renderer/store/types';

// Re-export types
export * from '@/renderer/store/types';

export async function checkStorageAvailability(): Promise<{ server: boolean; local: boolean }> {
    return checkAvailability();
}

// Auth operations
export async function register(
    username: string,
    password: string,
    options: { theme?: string; language?: string } = {},
): Promise<AuthResponse> {
    const adapter = await getStorageAdapter();
    return adapter.register({ username, password }, options);
}

export async function login(username: string, password: string): Promise<AuthResponse> {
    const adapter = await getStorageAdapter();
    return adapter.login({ username, password });
}

export async function logout(): Promise<void> {
    const adapter = await getStorageAdapter();
    return adapter.logout();
}

export async function getCurrentUser(): Promise<{ user: User }> {
    const adapter = await getStorageAdapter();
    return adapter.getCurrentUser();
}

export async function updateUsername(
    newUsername: string,
    password: string,
): Promise<{ message: string; username: string; token: string }> {
    const adapter = await getStorageAdapter();
    return adapter.updateUsername(newUsername, password);
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const adapter = await getStorageAdapter();
    return adapter.updatePassword(currentPassword, newPassword);
}

export async function deleteAccount(password: string): Promise<{ message: string }> {
    const adapter = await getStorageAdapter();
    return adapter.deleteAccount(password);
}

// Settings operations
export async function updateTheme(theme: User['theme']): Promise<{ message: string; theme: User['theme'] }> {
    const adapter = await getStorageAdapter();
    return adapter.updateTheme(theme);
}

export async function updateLanguage(
    language: User['language'],
): Promise<{ message: string; language: User['language'] }> {
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

// Recovery codes
export async function getRecoveryStatus(): Promise<RecoveryStatus> {
    const adapter = await getStorageAdapter();
    return adapter.getRecoveryStatus();
}

export async function generateRecoveryCodes(password: string): Promise<{ codes: string[] }> {
    const adapter = await getStorageAdapter();
    return adapter.generateRecoveryCodes(password);
}

export async function resetPasswordWithRecoveryCode(
    username: string,
    code: string,
    newPassword: string,
): Promise<{ message: string }> {
    const adapter = await getStorageAdapter();
    return adapter.resetPasswordWithRecoveryCode(username, code, newPassword);
}

// Data export/import (only for local mode)
export async function exportData(): Promise<string> {
    const adapter = await getStorageAdapter();
    if (adapter.exportData === undefined) {
        throw new Error('Export not supported in current storage mode');
    }
    return adapter.exportData();
}

export async function importData(data: string): Promise<{ message: string }> {
    const adapter = await getStorageAdapter();
    if (adapter.importData === undefined) {
        throw new Error('Import not supported in current storage mode');
    }
    return adapter.importData(data);
}

/** The active adapter, resolved on first use. Every wrapper above opens with it. */
async function getStorageAdapter(): Promise<IStorageAdapter> {
    return getAdapter();
}
