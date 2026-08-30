/**
 * Preload script — bridge between the Vue renderer and the Electron main process.
 * Exposes a narrow, typed API via contextBridge. Nothing else from Node or Electron
 * leaks into the renderer world.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '@/schemas/electron';

// Annotated, not inferred: the annotation is what makes a renamed or
// mistyped method fail the build instead of at the first click.
const api: ElectronAPI = {
    isElectron: (): boolean => true,

    // Vault
    findVaultPath: () => ipcRenderer.invoke('vault:findPath'),
    chooseVault: () => ipcRenderer.invoke('vault:choose'),
    closeVault: () => ipcRenderer.invoke('vault:close'),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateTheme: (theme: string) => ipcRenderer.invoke('settings:updateTheme', theme),
    updateLanguage: (language: string) => ipcRenderer.invoke('settings:updateLanguage', language),

    // Meditations
    createMeditation: (date: string, duration: number, notes: string) =>
        ipcRenderer.invoke('storage:createMeditation', date, duration, notes),
    getMeditations: () => ipcRenderer.invoke('storage:getMeditations'),

    // Emotion logs
    saveEmotionLog: (date: string, emotions: unknown[], note?: string) =>
        ipcRenderer.invoke('storage:saveEmotionLog', date, emotions, note),
    getEmotionLogs: (query?: unknown) => ipcRenderer.invoke('storage:getEmotionLogs', query),
    getEmotionAnalytics: (days?: number) => ipcRenderer.invoke('storage:getEmotionAnalytics', days),

    // Eightfold path
    saveEightfoldPathLog: (date: string, paths: unknown[]) =>
        ipcRenderer.invoke('storage:saveEightfoldPathLog', date, paths),
    getEightfoldPathLogs: (query?: unknown) => ipcRenderer.invoke('storage:getEightfoldPathLogs', query),
    getEightfoldPathAnalytics: (days?: number) => ipcRenderer.invoke('storage:getEightfoldPathAnalytics', days),
};

contextBridge.exposeInMainWorld('electronAPI', api);
