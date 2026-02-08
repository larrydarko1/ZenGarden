// Local-only storage API
// Re-export all storage functions
export {
    // Auth
    register,
    login,
    getCurrentUser,
    updateUsername,
    updatePassword,
    deleteAccount,

    // Settings
    updateTheme,
    updateLanguage,

    // Meditations
    createMeditation,
    getMeditations,

    // Emotions
    saveEmotionLog,
    getEmotionLogs,
    getEmotionAnalytics,

    // Eightfold Path
    saveEightfoldPathLog,
    getEightfoldPathLogs,
    getEightfoldPathAnalytics,

    // Storage mode management
    getStorageMode,
    checkStorageAvailability,

    // Data export/import
    exportData,
    importData
} from './store';
