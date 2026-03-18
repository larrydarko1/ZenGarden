// Preload script — bridge between the Vue renderer and the Electron main process.
// Exposes a narrow, typed API via contextBridge. Nothing else from Node or Electron
// leaks into the renderer world.

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: (): boolean => true,

    // Auth
    register: (username: string, password: string, theme: string, language: string) =>
        ipcRenderer.invoke('storage:register', username, password, theme, language),
    login: (username: string, password: string) => ipcRenderer.invoke('storage:login', username, password),
    logout: () => ipcRenderer.invoke('storage:logout'),
    getCurrentUser: () => ipcRenderer.invoke('storage:getCurrentUser'),
    updateUsername: (newUsername: string, password: string) =>
        ipcRenderer.invoke('storage:updateUsername', newUsername, password),
    updatePassword: (currentPassword: string, newPassword: string) =>
        ipcRenderer.invoke('storage:updatePassword', currentPassword, newPassword),
    deleteAccount: (password: string) => ipcRenderer.invoke('storage:deleteAccount', password),

    // Settings
    updateTheme: (theme: string) => ipcRenderer.invoke('storage:updateTheme', theme),
    updateLanguage: (language: string) => ipcRenderer.invoke('storage:updateLanguage', language),

    // Meditations
    createMeditation: (date: string, duration: number, notes: string) =>
        ipcRenderer.invoke('storage:createMeditation', date, duration, notes),
    getMeditations: () => ipcRenderer.invoke('storage:getMeditations'),

    // Emotion logs
    saveEmotionLog: (date: string, emotions: unknown[], note: string) =>
        ipcRenderer.invoke('storage:saveEmotionLog', date, emotions, note),
    getEmotionLogs: (query: unknown) => ipcRenderer.invoke('storage:getEmotionLogs', query),
    getEmotionAnalytics: (days: number) => ipcRenderer.invoke('storage:getEmotionAnalytics', days),

    // Eightfold path
    saveEightfoldPathLog: (date: string, paths: unknown[]) =>
        ipcRenderer.invoke('storage:saveEightfoldPathLog', date, paths),
    getEightfoldPathLogs: (query: unknown) => ipcRenderer.invoke('storage:getEightfoldPathLogs', query),
    getEightfoldPathAnalytics: (days: number) => ipcRenderer.invoke('storage:getEightfoldPathAnalytics', days),

    // Recovery codes
    getRecoveryStatus: () => ipcRenderer.invoke('storage:getRecoveryStatus'),
    generateRecoveryCodes: (password: string) => ipcRenderer.invoke('storage:generateRecoveryCodes', password),
    resetPasswordWithRecoveryCode: (username: string, code: string, newPassword: string) =>
        ipcRenderer.invoke('storage:resetPasswordWithRecoveryCode', username, code, newPassword),
});
