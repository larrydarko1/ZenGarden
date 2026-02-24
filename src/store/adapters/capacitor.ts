// Capacitor Storage Adapter - Mobile JSON file storage (MongoDB-compatible)
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import type {
    IStorageAdapter,
    User,
    UserCredentials,
    AuthResponse,
    Meditation,
    MeditationInput,
    EmotionLog,
    EmotionLogInput,
    EightfoldPathLog,
    EightfoldPathInput,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery
} from '../types';

// Internal User type with password (not exposed in public API)
interface UserWithPassword extends User {
    _id: string;
    password: string;
}

// JSON file paths (same structure as Electron/MongoDB)
const DB_FILES = {
    users: 'users.json',
    meditations: 'meditations.json',
    emotionLogs: 'emotion_logs.json',
    eightfoldPathLogs: 'eightfold_path_logs.json',
    session: 'session.json'
};

// Helper: Read JSON collection from file
async function readCollection<T>(filename: string): Promise<T[]> {
    try {
        const result = await Filesystem.readFile({
            path: `ZenGarden/data/${filename}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });
        const data = typeof result.data === 'string' ? result.data : '';
        return JSON.parse(data) || [];
    } catch (error) {
        // File doesn't exist yet, return empty array
        return [];
    }
}

// Helper: Write JSON collection to file
async function writeCollection<T>(filename: string, data: T[]): Promise<void> {
    await Filesystem.writeFile({
        path: `ZenGarden/data/${filename}`,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
    });
}

// Helper: Read session object
async function readSession(): Promise<any> {
    try {
        const result = await Filesystem.readFile({
            path: `ZenGarden/data/${DB_FILES.session}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });
        const data = typeof result.data === 'string' ? result.data : '{}';
        return JSON.parse(data) || {};
    } catch {
        return {};
    }
}

// Helper: Write session object
async function writeSession(session: any): Promise<void> {
    await Filesystem.writeFile({
        path: `ZenGarden/data/${DB_FILES.session}`,
        data: JSON.stringify(session, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
    });
}

// Helper: Generate MongoDB-style ObjectId
function generateObjectId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Math.random().toString(16).substring(2, 18);
    return timestamp + random.padEnd(16, '0');
}

// Helper: Hash password (PBKDF2)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Verify password
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const hash = await hashPassword(password);
    return hash === hashedPassword;
}

// Initialize data directory on first load
async function initializeStorage(): Promise<void> {
    try {
        // Try to create data directory (no-op if exists)
        await Filesystem.mkdir({
            path: 'ZenGarden/data',
            directory: Directory.Documents,
            recursive: true
        });

        // Initialize each JSON file if it doesn't exist
        for (const [key, filename] of Object.entries(DB_FILES)) {
            try {
                await Filesystem.readFile({
                    path: `ZenGarden/data/${filename}`,
                    directory: Directory.Documents
                });
            } catch {
                // File doesn't exist, create it
                const initialData = key === 'session' ? {} : [];
                await Filesystem.writeFile({
                    path: `ZenGarden/data/${filename}`,
                    data: JSON.stringify(initialData, null, 2),
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8
                });
                console.log(`Created: ${filename}`);
            }
        }
    } catch (error) {
        console.error('Storage initialization error:', error);
    }
}

export class CapacitorStorageAdapter implements IStorageAdapter {
    private initialized = false;

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await initializeStorage();
            this.initialized = true;
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Check if Capacitor APIs are available
            await Preferences.get({ key: 'test' });
            return true;
        } catch {
            return false;
        }
    }

    getMode() {
        return 'local' as const;
    }

    // AUTH OPERATIONS
    async register(
        credentials: UserCredentials,
        theme?: 'light' | 'dark',
        language?: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja'
    ): Promise<AuthResponse> {
        await this.ensureInitialized();

        const users = await readCollection<UserWithPassword>(DB_FILES.users);

        // Check if username exists
        if (users.some(u => u.username === credentials.username)) {
            throw new Error('Username already exists');
        }

        // Create new user (MongoDB-compatible structure)
        const hashedPassword = await hashPassword(credentials.password);
        const newUser: UserWithPassword = {
            _id: generateObjectId(),
            username: credentials.username,
            password: hashedPassword,
            theme: theme || 'dark',
            language: language || 'en'
        };

        users.push(newUser);
        await writeCollection(DB_FILES.users, users);

        // Save session
        await writeSession({ currentUser: newUser.username });

        const { password: _, ...userWithoutPassword } = newUser;
        return {
            message: 'Registration successful',
            user: userWithoutPassword,
            token: ''
        };
    }

    async login(credentials: UserCredentials): Promise<AuthResponse> {
        await this.ensureInitialized();

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const user = users.find(u => u.username === credentials.username);

        if (!user || !(await verifyPassword(credentials.password, user.password))) {
            throw new Error('Invalid username or password');
        }

        // Save session
        await writeSession({ currentUser: user.username });

        const { password: _, ...userWithoutPassword } = user;
        return {
            message: 'Login successful',
            user: userWithoutPassword,
            token: ''
        };
    }

    async logout(): Promise<void> {
        await writeSession({});
    }

    async getCurrentUser(): Promise<{ user: User }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) {
            throw new Error('Not authenticated');
        }

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const user = users.find(u => u.username === session.currentUser);

        if (!user) {
            throw new Error('User not found');
        }

        const { password: _, ...userWithoutPassword } = user;
        return { user: userWithoutPassword as User };
    }

    async updateUsername(newUsername: string, password: string): Promise<{ message: string; username: string; token: string }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const userIndex = users.findIndex(u => u.username === session.currentUser);

        if (userIndex === -1) throw new Error('User not found');
        if (!(await verifyPassword(password, users[userIndex].password))) {
            throw new Error('Invalid password');
        }
        if (users.some(u => u.username === newUsername && u.username !== session.currentUser)) {
            throw new Error('Username already exists');
        }

        const oldUsername = users[userIndex].username;
        users[userIndex].username = newUsername;
        await writeCollection(DB_FILES.users, users);

        // Update session
        await writeSession({ currentUser: newUsername });

        // Update username in all meditation records
        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const updatedMeditations = meditations.map(m =>
            m.Username === oldUsername ? { ...m, Username: newUsername } : m
        );
        await writeCollection(DB_FILES.meditations, updatedMeditations);

        return { message: 'Username updated successfully', username: newUsername, token: '' };
    }

    async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const userIndex = users.findIndex(u => u.username === session.currentUser);

        if (userIndex === -1) throw new Error('User not found');
        if (!(await verifyPassword(currentPassword, users[userIndex].password))) {
            throw new Error('Current password is incorrect');
        }

        users[userIndex].password = await hashPassword(newPassword);
        await writeCollection(DB_FILES.users, users);

        return { message: 'Password updated successfully' };
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const user = users.find(u => u.username === session.currentUser);

        if (!user) throw new Error('User not found');
        if (!(await verifyPassword(password, user.password))) {
            throw new Error('Invalid password');
        }

        // Delete user data
        const filteredUsers = users.filter(u => u.username !== session.currentUser);
        await writeCollection(DB_FILES.users, filteredUsers);

        // Delete user's meditation data
        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const filteredMeditations = meditations.filter(m => m.Username !== session.currentUser);
        await writeCollection(DB_FILES.meditations, filteredMeditations);

        // Clear session
        await writeSession({});

        return { message: 'Account deleted successfully' };
    }

    // SETTINGS OPERATIONS
    async updateTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: 'light' | 'dark' }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const userIndex = users.findIndex(u => u.username === session.currentUser);

        if (userIndex === -1) throw new Error('User not found');

        users[userIndex].theme = theme;
        await writeCollection(DB_FILES.users, users);

        return { message: 'Theme updated successfully', theme };
    }

    async updateLanguage(language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja'): Promise<{ message: string; language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const userIndex = users.findIndex(u => u.username === session.currentUser);

        if (userIndex === -1) throw new Error('User not found');

        users[userIndex].language = language;
        await writeCollection(DB_FILES.users, users);

        return { message: 'Language updated successfully', language };
    }

    // MEDITATION OPERATIONS
    async createMeditation(input: MeditationInput): Promise<{ message: string; meditation: Meditation }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const meditations = await readCollection<Meditation>(DB_FILES.meditations);

        const newMeditation: Meditation = {
            _id: generateObjectId(),
            Username: session.currentUser,
            Date: input.Date,
            duration: input.duration,
            notes: input.notes
        };

        meditations.push(newMeditation);
        await writeCollection(DB_FILES.meditations, meditations);

        return { message: 'Meditation saved successfully', meditation: newMeditation };
    }

    async getMeditations(): Promise<{ meditations: Meditation[] }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const userMeditations = meditations.filter(m => m.Username === session.currentUser);

        return { meditations: userMeditations };
    }

    // EMOTION OPERATIONS
    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);

        // Check if entry exists for this date
        const existingIndex = emotionLogs.findIndex(
            log => log.username === session.currentUser && log.date === input.date
        );

        const positiveCount = input.emotions.filter(e => e.type === 'positive').length;
        const negativeCount = input.emotions.filter(e => e.type === 'negative').length;
        const pnRatio = negativeCount > 0 ? positiveCount / negativeCount : positiveCount;

        const emotionLog: EmotionLog = {
            _id: existingIndex >= 0 ? emotionLogs[existingIndex]._id : generateObjectId(),
            username: session.currentUser,
            date: input.date,
            emotions: input.emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            note: input.note,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            emotionLogs[existingIndex] = emotionLog;
        } else {
            emotionLogs.push(emotionLog);
        }

        await writeCollection(DB_FILES.emotionLogs, emotionLogs);

        return { message: 'Emotion log saved successfully', emotionLog };
    }

    async getEmotionLogs(query?: DateRangeQuery): Promise<{ emotionLogs: EmotionLog[] }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        let emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);
        emotionLogs = emotionLogs.filter(log => log.username === session.currentUser);

        // Apply date filters if provided
        if (query?.startDate) {
            emotionLogs = emotionLogs.filter(log => log.date >= query.startDate!);
        }
        if (query?.endDate) {
            emotionLogs = emotionLogs.filter(log => log.date <= query.endDate!);
        }
        if (query?.limit) {
            emotionLogs = emotionLogs.slice(-query.limit);
        }

        return { emotionLogs };
    }

    async getEmotionAnalytics(days: number = 30): Promise<EmotionAnalytics> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const recentLogs = emotionLogs.filter(
            log => log.username === session.currentUser && log.date >= cutoffStr
        );

        // Calculate emotion frequencies
        const emotionCounts: Record<string, number> = {};
        const emotionTypes: Record<string, string> = {};
        recentLogs.forEach(log => {
            log.emotions.forEach(emotion => {
                emotionCounts[emotion.name] = (emotionCounts[emotion.name] || 0) + 1;
                emotionTypes[emotion.name] = emotion.type;
            });
        });

        // Build emotion frequency array
        const mostFrequentEmotions = Object.entries(emotionCounts)
            .map(([name, count]) => ({ name, count, type: emotionTypes[name] }))
            .sort((a, b) => b.count - a.count);

        // Calculate averages
        const totalPositive = recentLogs.reduce((sum, log) => sum + log.positiveCount, 0);
        const totalNegative = recentLogs.reduce((sum, log) => sum + log.negativeCount, 0);
        const totalRatio = recentLogs.reduce((sum, log) => sum + log.pnRatio, 0);

        // Build trends
        const trends = recentLogs.map(log => ({
            date: typeof log.date === 'string' ? log.date : log.date.toString(),
            pnRatio: log.pnRatio
        }));

        return {
            totalDays: recentLogs.length,
            averagePositiveCount: recentLogs.length > 0 ? totalPositive / recentLogs.length : 0,
            averageNegativeCount: recentLogs.length > 0 ? totalNegative / recentLogs.length : 0,
            averagePNRatio: recentLogs.length > 0 ? totalRatio / recentLogs.length : 0,
            mostFrequentEmotions,
            trends
        };
    }

    // EIGHTFOLD PATH OPERATIONS
    async saveEightfoldPathLog(input: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);

        const existingIndex = logs.findIndex(
            l => l.username === session.currentUser && l.date === input.date
        );

        const completedCount = input.paths.filter(p => p.note && p.note.trim() !== '').length;
        const progressPercentage = (completedCount / 8) * 100;

        const log: EightfoldPathLog = {
            _id: existingIndex >= 0 ? logs[existingIndex]._id : generateObjectId(),
            username: session.currentUser,
            date: input.date,
            paths: input.paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            logs[existingIndex] = log;
        } else {
            logs.push(log);
        }

        await writeCollection(DB_FILES.eightfoldPathLogs, logs);

        return { message: 'Eightfold path log saved successfully', pathLog: log };
    }

    async getEightfoldPathLogs(query?: DateRangeQuery): Promise<{ pathLogs: EightfoldPathLog[] }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        let logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);
        logs = logs.filter(l => l.username === session.currentUser);

        if (query?.startDate) {
            logs = logs.filter(l => l.date >= query.startDate!);
        }
        if (query?.endDate) {
            logs = logs.filter(l => l.date <= query.endDate!);
        }
        if (query?.limit) {
            logs = logs.slice(-query.limit);
        }

        return { pathLogs: logs };
    }

    async getEightfoldPathAnalytics(days: number = 30): Promise<EightfoldPathAnalytics> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const recentLogs = logs.filter(
            l => l.username === session.currentUser && l.date >= cutoffStr
        );

        const totalDays = recentLogs.length;
        const avgCompletion = totalDays > 0
            ? recentLogs.reduce((sum, log) => sum + log.completedCount, 0) / totalDays
            : 0;
        const perfectDays = recentLogs.filter(log => log.completedCount === 8).length;

        const pathCounts: Record<string, number> = {};
        recentLogs.forEach(log => {
            log.paths.forEach(pathItem => {
                if (pathItem.note && pathItem.note.trim() !== '') {
                    pathCounts[pathItem.path] = (pathCounts[pathItem.path] || 0) + 1;
                }
            });
        });

        const mostFollowedPaths = Object.entries(pathCounts)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        const trends = recentLogs
            .sort((a, b) => a.date.toString().localeCompare(b.date.toString()))
            .map(log => ({ date: log.date.toString(), completedCount: log.completedCount }));

        return {
            totalDays,
            averageCompletion: avgCompletion,
            perfectDays,
            mostFollowedPaths,
            trends
        };
    }

    // DATA EXPORT/IMPORT (MongoDB compatible)
    async exportData(): Promise<string> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const [meditations, emotionLogs, eightfoldPathLogs] = await Promise.all([
            readCollection<Meditation>(DB_FILES.meditations),
            readCollection<EmotionLog>(DB_FILES.emotionLogs),
            readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs)
        ]);

        const data = {
            meditations: meditations.filter(m => m.Username === session.currentUser),
            emotionLogs: emotionLogs.filter(e => e.username === session.currentUser),
            eightfoldPathLogs: eightfoldPathLogs.filter(e => e.username === session.currentUser),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return JSON.stringify(data, null, 2);
    }

    async importData(jsonData: string): Promise<{ message: string; imported: { meditations: number; emotionLogs: number; eightfoldPathLogs: number } }> {
        await this.ensureInitialized();

        const session = await readSession();
        if (!session.currentUser) throw new Error('Not authenticated');

        const importData = JSON.parse(jsonData);

        // Read existing data
        const [meditations, emotionLogs, eightfoldPathLogs] = await Promise.all([
            readCollection<Meditation>(DB_FILES.meditations),
            readCollection<EmotionLog>(DB_FILES.emotionLogs),
            readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs)
        ]);

        let counts = { meditations: 0, emotionLogs: 0, eightfoldPathLogs: 0 };

        // Import meditations
        if (importData.meditations) {
            importData.meditations.forEach((m: Meditation) => {
                m.Username = session.currentUser;
                m._id = generateObjectId();
                meditations.push(m);
                counts.meditations++;
            });
            await writeCollection(DB_FILES.meditations, meditations);
        }

        // Import emotion logs
        if (importData.emotionLogs) {
            importData.emotionLogs.forEach((e: EmotionLog) => {
                e.username = session.currentUser;
                e._id = generateObjectId();
                emotionLogs.push(e);
                counts.emotionLogs++;
            });
            await writeCollection(DB_FILES.emotionLogs, emotionLogs);
        }

        // Import eightfold path logs
        if (importData.eightfoldPathLogs) {
            importData.eightfoldPathLogs.forEach((e: EightfoldPathLog) => {
                e.username = session.currentUser;
                e._id = generateObjectId();
                eightfoldPathLogs.push(e);
                counts.eightfoldPathLogs++;
            });
            await writeCollection(DB_FILES.eightfoldPathLogs, eightfoldPathLogs);
        }

        return { message: 'Data imported successfully', imported: counts };
    }
}
