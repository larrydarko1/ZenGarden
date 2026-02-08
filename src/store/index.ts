// Main Storage API - Unified interface for all storage operations
import { StorageFactory } from './adapters/factory';

// Re-export types
export * from './types';
export { StorageFactory };

// Convenience functions that delegate to the factory
export async function getStorageAdapter() {
    return StorageFactory.getAdapter();
}

export async function getStorageMode() {
    const adapter = await getStorageAdapter();
    return adapter.getMode();
}

export async function checkStorageAvailability() {
    return StorageFactory.checkAvailability();
}

// Auth operations
export async function register(username: string, password: string, theme?: string, language?: string) {
    const adapter = await getStorageAdapter();
    return adapter.register({ username, password }, theme, language);
}

export async function login(username: string, password: string) {
    const adapter = await getStorageAdapter();
    return adapter.login({ username, password });
}

export async function logout() {
    const adapter = await getStorageAdapter();
    return adapter.logout();
}

export async function getCurrentUser() {
    const adapter = await getStorageAdapter();
    return adapter.getCurrentUser();
}

export async function updateUsername(newUsername: string, password: string) {
    const adapter = await getStorageAdapter();
    return adapter.updateUsername(newUsername, password);
}

export async function updatePassword(currentPassword: string, newPassword: string) {
    const adapter = await getStorageAdapter();
    return adapter.updatePassword(currentPassword, newPassword);
}

export async function deleteAccount(password: string) {
    const adapter = await getStorageAdapter();
    return adapter.deleteAccount(password);
}

// Settings operations
export async function updateTheme(theme: 'blue' | 'white' | 'dark') {
    const adapter = await getStorageAdapter();
    return adapter.updateTheme(theme);
}

export async function updateLanguage(language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja') {
    const adapter = await getStorageAdapter();
    return adapter.updateLanguage(language);
}

// Meditation operations
export async function createMeditation(Date: string, duration: number, notes: string) {
    const adapter = await getStorageAdapter();
    return adapter.createMeditation({ Date, duration, notes });
}

export async function getMeditations() {
    const adapter = await getStorageAdapter();
    return adapter.getMeditations();
}

// Emotion operations
export async function saveEmotionLog(date: string, emotions: Array<{ name: string; type: 'positive' | 'negative' }>, note?: string) {
    const adapter = await getStorageAdapter();
    return adapter.saveEmotionLog({ date, emotions, note });
}

export async function getEmotionLogs(query?: { startDate?: string; endDate?: string; limit?: number }) {
    const adapter = await getStorageAdapter();
    return adapter.getEmotionLogs(query);
}

export async function getEmotionAnalytics(days?: number) {
    const adapter = await getStorageAdapter();
    return adapter.getEmotionAnalytics(days);
}

// Eightfold Path operations
export async function saveEightfoldPathLog(date: string, paths: Array<{ path: string; note: string }>) {
    const adapter = await getStorageAdapter();
    return adapter.saveEightfoldPathLog({ date, paths });
}

export async function getEightfoldPathLogs(query?: { startDate?: string; endDate?: string; limit?: number }) {
    const adapter = await getStorageAdapter();
    return adapter.getEightfoldPathLogs(query);
}

export async function getEightfoldPathAnalytics(days?: number) {
    const adapter = await getStorageAdapter();
    return adapter.getEightfoldPathAnalytics(days);
}

// Data export/import (only for local mode)
export async function exportData() {
    const adapter = await getStorageAdapter();
    if (!adapter.exportData) {
        throw new Error('Export not supported in current storage mode');
    }
    return adapter.exportData();
}

export async function importData(data: string) {
    const adapter = await getStorageAdapter();
    if (!adapter.importData) {
        throw new Error('Import not supported in current storage mode');
    }
    return adapter.importData(data);
}
