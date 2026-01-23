// JSON Storage Backend - MongoDB-like document storage
const { app } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Data will be stored in user's app data folder as JSON files
// macOS: ~/Library/Application Support/zen-garden/data/*.json
// Windows: %APPDATA%/zen-garden/data/*.json
// Linux: ~/.config/zen-garden/data/*.json
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

console.log('📁 Data location:', dataPath);

// Clean up old SQLite files if they exist
const oldFiles = [
    path.join(userDataPath, 'zengarden.db'),
    path.join(userDataPath, 'zengarden.db-shm'),
    path.join(userDataPath, 'zengarden.db-wal')
];
oldFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('🧹 Cleaned up old file:', path.basename(file));
    }
});

// JSON file paths (like MongoDB collections)
const dbFiles = {
    users: path.join(dataPath, 'users.json'),
    meditations: path.join(dataPath, 'meditations.json'),
    emotionLogs: path.join(dataPath, 'emotion_logs.json'),
    gratitudeEntries: path.join(dataPath, 'gratitude_entries.json'),
    eightfoldPathLogs: path.join(dataPath, 'eightfold_path_logs.json'),
    session: path.join(dataPath, 'session.json')
};

// Initialize JSON files if they don't exist
Object.entries(dbFiles).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
        // Session file should be an object, others are arrays
        const initialData = key === 'session' ? {} : [];
        fs.writeFileSync(filePath, JSON.stringify(initialData), 'utf8');
    }
});

// Helper: Read collection (like MongoDB find())
function readCollection(collection) {
    try {
        const data = fs.readFileSync(dbFiles[collection], 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${collection}:`, error);
        return [];
    }
}

// Helper: Write collection (like MongoDB save())
function writeCollection(collection, data) {
    try {
        fs.writeFileSync(dbFiles[collection], JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${collection}:`, error);
        return false;
    }
}

// Helper: Generate unique ID (like MongoDB ObjectId)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Current session - load from file if exists
let currentSession = null;
try {
    const sessionData = fs.readFileSync(dbFiles.session, 'utf8');
    const saved = JSON.parse(sessionData);
    if (saved.username && saved.token) {
        currentSession = saved;
        console.log('🔐 Restored session for:', saved.username);
    }
} catch (error) {
    // No saved session, start fresh
    currentSession = null;
}

// Helper: Save session to file
function saveSession() {
    try {
        const data = currentSession || {};
        fs.writeFileSync(dbFiles.session, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

// Helper: Hash password with salt
function hashPassword(password, salt = null) {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha256').toString('hex');
    return { hash, salt: useSalt };
}

// Helper: Verify password
function verifyPassword(password, storedHash, storedSalt) {
    const { hash } = hashPassword(password, storedSalt);
    return hash === storedHash;
}

// Helper: Generate session token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Storage handlers
const storageHandlers = {
    // AUTH OPERATIONS
    'storage:register': async (event, username, password, theme = 'blue', language = 'en') => {
        try {
            const trimmed = username.trim();
            if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
                throw new Error('Username must be 3-32 alphanumeric characters');
            }

            const users = readCollection('users');
            const existing = users.find(u => u.username === trimmed);
            if (existing) {
                throw new Error('Username already exists');
            }

            const { hash, salt } = hashPassword(password);

            const newUser = {
                username: trimmed,
                passwordHash: hash,
                salt,
                theme,
                language,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            writeCollection('users', users);

            const token = generateToken();
            currentSession = { username: trimmed, token };
            saveSession();

            return {
                message: 'Registration successful',
                user: { username: trimmed, theme, language },
                token
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    'storage:login': async (event, username, password) => {
        try {
            const users = readCollection('users');
            const user = users.find(u => u.username === username.trim());

            if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
                throw new Error('Invalid username or password');
            }

            const token = generateToken();
            currentSession = { username: user.username, token };
            saveSession();

            return {
                message: 'Login successful',
                user: {
                    username: user.username,
                    theme: user.theme,
                    language: user.language
                },
                token
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    'storage:getCurrentUser': async () => {
        if (!currentSession) return null;

        const users = readCollection('users');
        const user = users.find(u => u.username === currentSession.username);

        if (!user) return null;

        return {
            username: user.username,
            theme: user.theme,
            language: user.language
        };
    },

    'storage:updateUsername': async (event, newUsername, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        try {
            const users = readCollection('users');
            const user = users.find(u => u.username === currentSession.username);

            if (!verifyPassword(password, user.passwordHash, user.salt)) {
                throw new Error('Invalid password');
            }

            const trimmed = newUsername.trim();
            if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
                throw new Error('Username must be 3-32 alphanumeric characters');
            }

            const oldUsername = currentSession.username;
            user.username = trimmed;
            writeCollection('users', users);

            // Update username in all collections
            ['meditations', 'emotionLogs', 'gratitudeEntries', 'eightfoldPathLogs'].forEach(collection => {
                const items = readCollection(collection);
                items.forEach(item => {
                    if (item.username === oldUsername || item.Username === oldUsername) {
                        if (item.username) item.username = trimmed;
                        if (item.Username) item.Username = trimmed;
                    }
                });
                writeCollection(collection, items);
            });

            currentSession.username = trimmed;

            return { message: 'Username updated successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    'storage:updatePassword': async (event, currentPassword, newPassword) => {
        if (!currentSession) throw new Error('Not authenticated');

        try {
            const users = readCollection('users');
            const user = users.find(u => u.username === currentSession.username);

            if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
                throw new Error('Current password is incorrect');
            }

            const { hash, salt } = hashPassword(newPassword);
            user.passwordHash = hash;
            user.salt = salt;

            writeCollection('users', users);

            return { message: 'Password updated successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    'storage:updateTheme': async (event, theme) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection('users');
        const user = users.find(u => u.username === currentSession.username);
        user.theme = theme;
        writeCollection('users', users);

        return { message: 'Theme updated successfully' };
    },

    'storage:updateLanguage': async (event, language) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection('users');
        const user = users.find(u => u.username === currentSession.username);
        user.language = language;
        writeCollection('users', users);

        return { message: 'Language updated successfully' };
    },

    'storage:logout': async (event) => {
        try {
            currentSession = null;
            saveSession();
            return { message: 'Logged out successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    'storage:deleteAccount': async (event, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        try {
            const users = readCollection('users');
            const userIndex = users.findIndex(u => u.username === currentSession.username);
            const user = users[userIndex];

            if (!verifyPassword(password, user.passwordHash, user.salt)) {
                throw new Error('Invalid password');
            }

            // Remove user
            users.splice(userIndex, 1);
            writeCollection('users', users);

            // Remove all user's data
            const username = currentSession.username;
            ['meditations', 'emotionLogs', 'gratitudeEntries', 'eightfoldPathLogs'].forEach(collection => {
                const items = readCollection(collection);
                const filtered = items.filter(item =>
                    (item.username !== username && item.Username !== username)
                );
                writeCollection(collection, filtered);
            });

            currentSession = null;
            saveSession();

            return { message: 'Account deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // MEDITATION OPERATIONS
    'storage:createMeditation': async (event, date, duration, notes) => {
        if (!currentSession) throw new Error('Not authenticated');

        const meditations = readCollection('meditations');

        const newMeditation = {
            _id: generateId(),
            Username: currentSession.username,
            Date: date,
            duration,
            notes,
            createdAt: new Date().toISOString()
        };

        meditations.push(newMeditation);
        writeCollection('meditations', meditations);

        return newMeditation;
    },

    'storage:getMeditations': async () => {
        if (!currentSession) throw new Error('Not authenticated');

        const meditations = readCollection('meditations');
        return meditations
            .filter(m => m.Username === currentSession.username)
            .sort((a, b) => new Date(b.Date) - new Date(a.Date));
    },

    // EMOTION OPERATIONS
    'storage:saveEmotionLog': async (event, date, emotions) => {
        if (!currentSession) throw new Error('Not authenticated');

        const positiveCount = emotions.filter(e => e.type === 'positive').length;
        const negativeCount = emotions.filter(e => e.type === 'negative').length;
        const pnRatio = negativeCount > 0 ? positiveCount / negativeCount : positiveCount;

        const emotionLogs = readCollection('emotionLogs');
        const existingIndex = emotionLogs.findIndex(
            log => log.username === currentSession.username && log.date === date
        );

        const emotionLog = {
            _id: existingIndex >= 0 ? emotionLogs[existingIndex]._id : generateId(),
            username: currentSession.username,
            date,
            emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            emotionLogs[existingIndex] = emotionLog;
        } else {
            emotionLogs.push(emotionLog);
        }

        writeCollection('emotionLogs', emotionLogs);

        return emotionLog;
    },

    'storage:getEmotionLogs': async (event, query = {}) => {
        if (!currentSession) throw new Error('Not authenticated');

        let logs = readCollection('emotionLogs')
            .filter(log => log.username === currentSession.username);

        if (query.startDate) {
            logs = logs.filter(log => log.date >= query.startDate);
        }
        if (query.endDate) {
            logs = logs.filter(log => log.date <= query.endDate);
        }

        logs.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (query.limit) {
            logs = logs.slice(0, query.limit);
        }

        return logs;
    },

    'storage:getEmotionAnalytics': async (event, days = 30) => {
        if (!currentSession) throw new Error('Not authenticated');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const logs = readCollection('emotionLogs')
            .filter(log =>
                log.username === currentSession.username &&
                log.date >= cutoffStr
            )
            .sort((a, b) => a.date.localeCompare(b.date));

        if (logs.length === 0) {
            return {
                totalDays: 0,
                averagePositiveCount: 0,
                averageNegativeCount: 0,
                averagePNRatio: 0,
                emotionDiversity: 0,
                positiveDays: 0,
                negativeDays: 0,
                topEmotions: [],
                trends: []
            };
        }

        // Calculate basic totals
        const totals = logs.reduce((acc, log) => ({
            positive: acc.positive + log.positiveCount,
            negative: acc.negative + log.negativeCount,
            ratio: acc.ratio + log.pnRatio
        }), { positive: 0, negative: 0, ratio: 0 });

        // Count positive/negative days (P/N ratio >= 0.5 is positive day)
        let positiveDays = 0;
        let negativeDays = 0;
        logs.forEach(log => {
            if (log.pnRatio >= 0.5) {
                positiveDays++;
            } else {
                negativeDays++;
            }
        });

        // Calculate emotion diversity (unique emotions tracked)
        const uniqueEmotions = new Set();
        logs.forEach(log => {
            if (log.emotions && Array.isArray(log.emotions)) {
                log.emotions.forEach(emotion => {
                    uniqueEmotions.add(emotion.name);
                });
            }
        });

        // Count emotion frequencies for top emotions
        const emotionCounts = {};
        logs.forEach(log => {
            if (log.emotions && Array.isArray(log.emotions)) {
                log.emotions.forEach(emotion => {
                    if (!emotionCounts[emotion.name]) {
                        emotionCounts[emotion.name] = {
                            name: emotion.name,
                            type: emotion.type,
                            count: 0
                        };
                    }
                    emotionCounts[emotion.name].count++;
                });
            }
        });

        // Sort emotions by count and get top ones
        const topEmotions = Object.values(emotionCounts)
            .sort((a, b) => b.count - a.count);

        // Build trends array (P/N ratio per day)
        const trends = logs.map(log => ({
            date: log.date,
            pnRatio: log.pnRatio
        }));

        return {
            totalDays: logs.length,
            averagePositiveCount: totals.positive / logs.length,
            averageNegativeCount: totals.negative / logs.length,
            averagePNRatio: totals.ratio / logs.length,
            emotionDiversity: uniqueEmotions.size,
            positiveDays,
            negativeDays,
            topEmotions,
            trends
        };
    },

    // GRATITUDE OPERATIONS
    'storage:saveGratitudeEntry': async (event, date, text) => {
        if (!currentSession) throw new Error('Not authenticated');

        const gratitudeEntries = readCollection('gratitudeEntries');
        const existingIndex = gratitudeEntries.findIndex(
            entry => entry.username === currentSession.username && entry.date === date
        );

        const gratitudeEntry = {
            _id: existingIndex >= 0 ? gratitudeEntries[existingIndex]._id : generateId(),
            username: currentSession.username,
            date,
            text,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            gratitudeEntries[existingIndex] = gratitudeEntry;
        } else {
            gratitudeEntries.push(gratitudeEntry);
        }

        writeCollection('gratitudeEntries', gratitudeEntries);

        return gratitudeEntry;
    },

    'storage:getGratitudeEntries': async (event, query = {}) => {
        if (!currentSession) throw new Error('Not authenticated');

        let entries = readCollection('gratitudeEntries')
            .filter(entry => entry.username === currentSession.username);

        if (query.startDate) {
            entries = entries.filter(entry => entry.date >= query.startDate);
        }
        if (query.endDate) {
            entries = entries.filter(entry => entry.date <= query.endDate);
        }

        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (query.limit) {
            entries = entries.slice(0, query.limit);
        }

        return entries;
    },

    // EIGHTFOLD PATH OPERATIONS
    'storage:saveEightfoldPathLog': async (event, date, paths) => {
        if (!currentSession) throw new Error('Not authenticated');

        const completedCount = paths.filter(p => p.note && p.note.trim() !== '').length;
        const progressPercentage = (completedCount / 8) * 100;

        const eightfoldPathLogs = readCollection('eightfoldPathLogs');
        const existingIndex = eightfoldPathLogs.findIndex(
            log => log.username === currentSession.username && log.date === date
        );

        const pathLog = {
            _id: existingIndex >= 0 ? eightfoldPathLogs[existingIndex]._id : generateId(),
            username: currentSession.username,
            date,
            paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            eightfoldPathLogs[existingIndex] = pathLog;
        } else {
            eightfoldPathLogs.push(pathLog);
        }

        writeCollection('eightfoldPathLogs', eightfoldPathLogs);

        return pathLog;
    },

    'storage:getEightfoldPathLogs': async (event, query = {}) => {
        if (!currentSession) throw new Error('Not authenticated');

        let logs = readCollection('eightfoldPathLogs')
            .filter(log => log.username === currentSession.username);

        if (query.startDate) {
            logs = logs.filter(log => log.date >= query.startDate);
        }
        if (query.endDate) {
            logs = logs.filter(log => log.date <= query.endDate);
        }

        logs.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (query.limit) {
            logs = logs.slice(0, query.limit);
        }

        return logs;
    },

    'storage:getEightfoldPathAnalytics': async (event, days = 30) => {
        if (!currentSession) throw new Error('Not authenticated');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const logs = readCollection('eightfoldPathLogs')
            .filter(log =>
                log.username === currentSession.username &&
                log.date >= cutoffStr
            );

        if (logs.length === 0) {
            return {
                totalDays: 0,
                averageCompletedCount: 0,
                averageProgressPercentage: 0
            };
        }

        const totals = logs.reduce((acc, log) => ({
            completed: acc.completed + log.completedCount,
            progress: acc.progress + log.progressPercentage
        }), { completed: 0, progress: 0 });

        return {
            totalDays: logs.length,
            averageCompletedCount: totals.completed / logs.length,
            averageProgressPercentage: totals.progress / logs.length
        };
    }
};

// Setup IPC handlers
function setupStorageHandlers(ipcMain) {
    for (const [channel, handler] of Object.entries(storageHandlers)) {
        ipcMain.handle(channel, handler);
    }
    console.log('✅ Storage handlers registered');
}

module.exports = { setupStorageHandlers };
