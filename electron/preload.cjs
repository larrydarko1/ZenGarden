// Preload script - Bridge between frontend (Vue) and backend (Node.js)
// This exposes safe APIs to the renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose storage API to the frontend
contextBridge.exposeInMainWorld('electronAPI', {
    // Auth operations
    register: (username, password, theme, language) =>
        ipcRenderer.invoke('storage:register', username, password, theme, language),
    login: (username, password) =>
        ipcRenderer.invoke('storage:login', username, password),
    logout: () =>
        ipcRenderer.invoke('storage:logout'),
    getCurrentUser: () =>
        ipcRenderer.invoke('storage:getCurrentUser'),
    updateUsername: (newUsername, password) =>
        ipcRenderer.invoke('storage:updateUsername', newUsername, password),
    updatePassword: (currentPassword, newPassword) =>
        ipcRenderer.invoke('storage:updatePassword', currentPassword, newPassword),
    deleteAccount: (password) =>
        ipcRenderer.invoke('storage:deleteAccount', password),

    // Settings operations
    updateTheme: (theme) =>
        ipcRenderer.invoke('storage:updateTheme', theme),
    updateLanguage: (language) =>
        ipcRenderer.invoke('storage:updateLanguage', language),

    // Meditation operations
    createMeditation: (date, duration, notes) =>
        ipcRenderer.invoke('storage:createMeditation', date, duration, notes),
    getMeditations: () =>
        ipcRenderer.invoke('storage:getMeditations'),

    // Emotion operations
    saveEmotionLog: (date, emotions, note) =>
        ipcRenderer.invoke('storage:saveEmotionLog', date, emotions, note),
    getEmotionLogs: (query) =>
        ipcRenderer.invoke('storage:getEmotionLogs', query),
    getEmotionAnalytics: (days) =>
        ipcRenderer.invoke('storage:getEmotionAnalytics', days),

    // Eightfold Path operations
    saveEightfoldPathLog: (date, paths) =>
        ipcRenderer.invoke('storage:saveEightfoldPathLog', date, paths),
    getEightfoldPathLogs: (query) =>
        ipcRenderer.invoke('storage:getEightfoldPathLogs', query),
    getEightfoldPathAnalytics: (days) =>
        ipcRenderer.invoke('storage:getEightfoldPathAnalytics', days),

    // Utility
    isElectron: () => true
});
