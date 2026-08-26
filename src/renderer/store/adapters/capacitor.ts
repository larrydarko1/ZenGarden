/**
 * Capacitor Storage Adapter - Mobile JSON file storage (MongoDB-compatible)
 * Owns: class facade implementing IStorageAdapter. Delegates to capacitor/ sub-modules.
 */

import { Preferences } from '@capacitor/preferences';
import {
    DB_FILES,
    readCollection,
    writeCollection,
    readSession,
    writeSession,
    generateObjectId,
    initializeStorage,
} from '@/renderer/store/adapters/capacitor/db';
import { hashPassword, verifyPassword, upgradeHashIfNeeded } from '@/renderer/store/adapters/capacitor/crypto';
import { RECOVERY_CODE_COUNT, generateRecoveryCode } from '@/schemas/password';
import type { UserWithPassword } from '@/renderer/store/adapters/capacitor/crypto';
import type {
    IStorageAdapter,
    User,
    UserCredentials,
    AuthResponse,
    Meditation,
    MeditationInput,
    Emotion,
    EmotionLog,
    EmotionLogInput,
    EightfoldPathLog,
    EightfoldPathInput,
    PathItem,
    EmotionAnalytics,
    EightfoldPathAnalytics,
    DateRangeQuery,
    RecoveryStatus,
} from '@/renderer/store/types';

type RecoveryCode = { hash: string; salt: string; used: boolean };
type UserRecord = UserWithPassword & { recoveryCodes?: RecoveryCode[] };

export class CapacitorStorageAdapter implements IStorageAdapter {
    private initialized = false;

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await initializeStorage();
            this.initialized = true;
        }
    }

    private async getSignedInUsername(): Promise<string> {
        await this.ensureInitialized();

        const session = await readSession();
        if (session.currentUser === undefined || session.currentUser === '') throw new Error('Not authenticated');

        return session.currentUser;
    }

    private async getCurrentUserRecord(): Promise<{ users: UserRecord[]; index: number; username: string }> {
        const username = await this.getSignedInUsername();

        const users = await readCollection<UserRecord>(DB_FILES.users);
        const index = users.findIndex((u) => u.username === username);
        if (index === -1) throw new Error('User not found');

        return { users, index, username };
    }

    async probeAvailability(): Promise<boolean> {
        try {
            // Check if Capacitor APIs are available
            await Preferences.get({ key: 'test' });
            return true;
        } catch {
            return false;
        }
    }

    async register(
        credentials: UserCredentials,
        options: { theme?: 'light' | 'dark'; language?: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' } = {},
    ): Promise<AuthResponse> {
        await this.ensureInitialized();

        const users = await readCollection<UserWithPassword>(DB_FILES.users);

        // Check if username exists
        if (users.some((u) => u.username === credentials.username)) {
            throw new Error('Username already exists');
        }

        if (credentials.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Create new user (MongoDB-compatible structure)
        const hashedPassword = await hashPassword(credentials.password);
        const newUser: UserWithPassword = {
            _id: generateObjectId(),
            username: credentials.username,
            password: hashedPassword,
            theme: options.theme ?? 'dark',
            language: options.language ?? 'en',
        };

        users.push(newUser);
        await writeCollection(DB_FILES.users, users);

        // Save session
        await writeSession({ currentUser: newUser.username });

        const { password: _, ...userWithoutPassword } = newUser;
        return {
            message: 'Registration successful',
            user: userWithoutPassword,
            token: '',
        };
    }

    async login(credentials: UserCredentials): Promise<AuthResponse> {
        await this.ensureInitialized();

        const users = await readCollection<UserWithPassword>(DB_FILES.users);
        const user = users.find((u) => u.username === credentials.username);

        if (user === undefined || !(await verifyPassword(credentials.password, user.password))) {
            throw new Error('Invalid username or password');
        }

        // Upgrade legacy SHA-256 hash to PBKDF2 on successful login
        const userIndex = users.findIndex((u) => u.username === credentials.username);
        await upgradeHashIfNeeded(users, userIndex, credentials.password, DB_FILES.users);

        // Save session
        await writeSession({ currentUser: user.username });

        const { password: _, ...userWithoutPassword } = user;
        return {
            message: 'Login successful',
            user: userWithoutPassword,
            token: '',
        };
    }

    async logout(): Promise<void> {
        await writeSession({});
    }

    async getCurrentUser(): Promise<{ user: User }> {
        const { users, index } = await this.getCurrentUserRecord();

        const { password: _, ...userWithoutPassword } = users[index];
        return { user: userWithoutPassword };
    }

    async updateUsername(
        newUsername: string,
        password: string,
    ): Promise<{ message: string; username: string; token: string }> {
        const { users, index, username } = await this.getCurrentUserRecord();

        if (!(await verifyPassword(password, users[index].password))) {
            throw new Error('Invalid password');
        }
        if (users.some((u) => u.username === newUsername && u.username !== username)) {
            throw new Error('Username already exists');
        }

        const oldUsername = users[index].username;
        users[index].username = newUsername;
        await writeCollection(DB_FILES.users, users);

        // Update session
        await writeSession({ currentUser: newUsername });

        // Update username in all meditation records
        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const updatedMeditations = meditations.map((m) =>
            m.username === oldUsername ? { ...m, username: newUsername } : m,
        );
        await writeCollection(DB_FILES.meditations, updatedMeditations);

        return { message: 'Username updated successfully', username: newUsername, token: '' };
    }

    async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const { users, index } = await this.getCurrentUserRecord();

        if (!(await verifyPassword(currentPassword, users[index].password))) {
            throw new Error('Current password is incorrect');
        }

        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        users[index].password = await hashPassword(newPassword);
        await writeCollection(DB_FILES.users, users);

        return { message: 'Password updated successfully' };
    }

    async deleteAccount(password: string): Promise<{ message: string }> {
        const { users, index, username } = await this.getCurrentUserRecord();

        if (!(await verifyPassword(password, users[index].password))) {
            throw new Error('Invalid password');
        }

        // Delete user data
        const filteredUsers = users.filter((u) => u.username !== username);
        await writeCollection(DB_FILES.users, filteredUsers);

        // Delete user's meditation data
        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const filteredMeditations = meditations.filter((m) => m.username !== username);
        await writeCollection(DB_FILES.meditations, filteredMeditations);

        // Clear session
        await writeSession({});

        return { message: 'Account deleted successfully' };
    }

    // ─── Settings ────────────────────────────────────────────────────────────
    async updateTheme(theme: 'light' | 'dark'): Promise<{ message: string; theme: 'light' | 'dark' }> {
        const { users, index } = await this.getCurrentUserRecord();

        users[index].theme = theme;
        await writeCollection(DB_FILES.users, users);

        return { message: 'Theme updated successfully', theme };
    }

    async updateLanguage(
        language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja',
    ): Promise<{ message: string; language: 'en' | 'es' | 'it' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' }> {
        const { users, index } = await this.getCurrentUserRecord();

        users[index].language = language;
        await writeCollection(DB_FILES.users, users);

        return { message: 'Language updated successfully', language };
    }

    // ─── Meditations ─────────────────────────────────────────────────────────
    async createMeditation(input: MeditationInput): Promise<{ message: string; meditation: Meditation }> {
        const currentUser = await this.getSignedInUsername();

        const meditations = await readCollection<Meditation>(DB_FILES.meditations);

        const newMeditation: Meditation = {
            _id: generateObjectId(),
            username: currentUser,
            date: input.date,
            duration: input.duration,
            notes: input.notes,
        };

        meditations.push(newMeditation);
        await writeCollection(DB_FILES.meditations, meditations);

        return { message: 'Meditation saved successfully', meditation: newMeditation };
    }

    async getMeditations(): Promise<{ meditations: Meditation[] }> {
        const currentUser = await this.getSignedInUsername();

        const meditations = await readCollection<Meditation>(DB_FILES.meditations);
        const userMeditations = meditations.filter((m) => m.username === currentUser);

        return { meditations: userMeditations };
    }

    // ─── Emotions ────────────────────────────────────────────────────────────
    async saveEmotionLog(input: EmotionLogInput): Promise<{ message: string; emotionLog: EmotionLog }> {
        const currentUser = await this.getSignedInUsername();

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);

        // Check if entry exists for this date
        const existingIndex = emotionLogs.findIndex((log) => log.username === currentUser && log.date === input.date);

        const positiveCount = input.emotions.filter((e) => e.type === 'positive').length;
        const negativeCount = input.emotions.filter((e) => e.type === 'negative').length;
        const pnRatio = negativeCount > 0 ? positiveCount / negativeCount : positiveCount;

        const emotionLog: EmotionLog = {
            _id: existingIndex >= 0 ? emotionLogs[existingIndex]._id : generateObjectId(),
            username: currentUser,
            date: input.date,
            emotions: input.emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            note: input.note,
            updatedAt: new Date().toISOString(),
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
        const currentUser = await this.getSignedInUsername();

        let emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);
        emotionLogs = emotionLogs.filter((log) => log.username === currentUser);

        // Apply date filters if provided
        if (query?.startDate !== undefined && query.startDate !== '') {
            const startDate = query.startDate;
            emotionLogs = emotionLogs.filter((log) => log.date >= startDate);
        }
        if (query?.endDate !== undefined && query.endDate !== '') {
            const endDate = query.endDate;
            emotionLogs = emotionLogs.filter((log) => log.date <= endDate);
        }
        if (query?.limit !== undefined && query.limit > 0) {
            emotionLogs = emotionLogs.slice(-query.limit);
        }

        return { emotionLogs };
    }

    async getEmotionAnalytics(days = 30): Promise<EmotionAnalytics> {
        const currentUser = await this.getSignedInUsername();

        const emotionLogs = await readCollection<EmotionLog>(DB_FILES.emotionLogs);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const recentLogs = emotionLogs.filter((log) => log.username === currentUser && log.date >= cutoffStr);

        // Calculate emotion frequencies
        const emotionCounts: Record<string, number> = {};
        const emotionTypes: Record<string, string> = {};
        const uniqueEmotions = new Set<string>();
        let positiveDays = 0;
        let negativeDays = 0;

        recentLogs.forEach((log) => {
            if (log.pnRatio >= 0.5) positiveDays++;
            else negativeDays++;

            log.emotions.forEach((emotion) => {
                uniqueEmotions.add(emotion.name);
                emotionCounts[emotion.name] = (emotionCounts[emotion.name] ?? 0) + 1;
                emotionTypes[emotion.name] = emotion.type;
            });
        });

        // Build emotion frequency array
        const topEmotions = Object.entries(emotionCounts)
            .map(([name, count]) => ({ name, count, type: emotionTypes[name] }))
            .sort((a, b) => b.count - a.count);

        // Calculate averages
        const totalPositive = recentLogs.reduce((sum, log) => sum + log.positiveCount, 0);
        const totalNegative = recentLogs.reduce((sum, log) => sum + log.negativeCount, 0);
        const totalRatio = recentLogs.reduce((sum, log) => sum + log.pnRatio, 0);

        // Build trends
        const trends = recentLogs.map((log) => ({
            date: typeof log.date === 'string' ? log.date : log.date.toString(),
            pnRatio: log.pnRatio,
        }));

        return {
            totalDays: recentLogs.length,
            averagePositiveCount: recentLogs.length > 0 ? totalPositive / recentLogs.length : 0,
            averageNegativeCount: recentLogs.length > 0 ? totalNegative / recentLogs.length : 0,
            averagePNRatio: recentLogs.length > 0 ? totalRatio / recentLogs.length : 0,
            emotionDiversity: uniqueEmotions.size,
            positiveDays,
            negativeDays,
            topEmotions,
            trends,
        };
    }

    // ─── Eightfold path ──────────────────────────────────────────────────────
    async saveEightfoldPathLog(input: EightfoldPathInput): Promise<{ message: string; pathLog: EightfoldPathLog }> {
        const currentUser = await this.getSignedInUsername();

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);

        const existingIndex = logs.findIndex((l) => l.username === currentUser && l.date === input.date);

        const completedCount = input.paths.filter((p) => p.note !== undefined && p.note.trim() !== '').length;
        const progressPercentage = (completedCount / 8) * 100;

        const log: EightfoldPathLog = {
            _id: existingIndex >= 0 ? logs[existingIndex]._id : generateObjectId(),
            username: currentUser,
            date: input.date,
            paths: input.paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString(),
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
        const currentUser = await this.getSignedInUsername();

        let logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);
        logs = logs.filter((l) => l.username === currentUser);

        if (query?.startDate !== undefined && query.startDate !== '') {
            const startDate = query.startDate;
            logs = logs.filter((l) => l.date >= startDate);
        }
        if (query?.endDate !== undefined && query.endDate !== '') {
            const endDate = query.endDate;
            logs = logs.filter((l) => l.date <= endDate);
        }
        if (query?.limit !== undefined && query.limit > 0) {
            logs = logs.slice(-query.limit);
        }

        return { pathLogs: logs };
    }

    async getEightfoldPathAnalytics(days = 30): Promise<EightfoldPathAnalytics> {
        const currentUser = await this.getSignedInUsername();

        const logs = await readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const recentLogs = logs.filter((l) => l.username === currentUser && l.date >= cutoffStr);

        const totalDays = recentLogs.length;
        const avgCompletion =
            totalDays > 0 ? recentLogs.reduce((sum, log) => sum + log.completedCount, 0) / totalDays : 0;
        const perfectDays = recentLogs.filter((log) => log.completedCount === 8).length;

        const pathCounts: Record<string, number> = {};
        recentLogs.forEach((log) => {
            log.paths.forEach((pathItem) => {
                if (pathItem.note !== undefined && pathItem.note.trim() !== '') {
                    pathCounts[pathItem.path] = (pathCounts[pathItem.path] ?? 0) + 1;
                }
            });
        });

        const mostFollowedPaths = Object.entries(pathCounts)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        const trends = recentLogs
            .sort((a, b) => a.date.toString().localeCompare(b.date.toString()))
            .map((log) => ({ date: log.date.toString(), completedCount: log.completedCount }));

        return {
            totalDays,
            averageCompletion: avgCompletion,
            perfectDays,
            mostFollowedPaths,
            trends,
        };
    }

    // ─── Data export/import ──────────────────────────────────────────────────
    async exportData(): Promise<string> {
        const currentUser = await this.getSignedInUsername();

        const [meditations, emotionLogs, eightfoldPathLogs] = await Promise.all([
            readCollection<Meditation>(DB_FILES.meditations),
            readCollection<EmotionLog>(DB_FILES.emotionLogs),
            readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs),
        ]);

        const data = {
            meditations: meditations.filter((m) => m.username === currentUser),
            emotionLogs: emotionLogs.filter((e) => e.username === currentUser),
            eightfoldPathLogs: eightfoldPathLogs.filter((e) => e.username === currentUser),
            exportDate: new Date().toISOString(),
            version: '1.0',
        };

        return JSON.stringify(data, null, 2);
    }

    async importData(
        jsonData: string,
    ): Promise<{ message: string; imported: { meditations: number; emotionLogs: number; eightfoldPathLogs: number } }> {
        const currentUser = await this.getSignedInUsername();

        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonData);
        } catch {
            throw new Error('Invalid JSON data');
        }

        // Validate top-level structure before trusting any fields
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Import data must be a JSON object');
        }
        const importPayload = parsed as Record<string, unknown>;

        const isArrayOfObjects = (val: unknown): val is Record<string, unknown>[] =>
            Array.isArray(val) && val.every((item) => typeof item === 'object' && item !== null);

        const isEmotionArray = (val: unknown): val is Emotion[] =>
            isArrayOfObjects(val) &&
            val.every(
                (item) =>
                    typeof item['name'] === 'string' && (item['type'] === 'positive' || item['type'] === 'negative'),
            );

        const isPathItemArray = (val: unknown): val is PathItem[] =>
            isArrayOfObjects(val) &&
            val.every((item) => typeof item['path'] === 'string' && typeof item['note'] === 'string');

        // Read existing data
        const [meditations, emotionLogs, eightfoldPathLogs] = await Promise.all([
            readCollection<Meditation>(DB_FILES.meditations),
            readCollection<EmotionLog>(DB_FILES.emotionLogs),
            readCollection<EightfoldPathLog>(DB_FILES.eightfoldPathLogs),
        ]);

        const counts = { meditations: 0, emotionLogs: 0, eightfoldPathLogs: 0 };

        // Import meditations — only accept objects with required fields
        if (isArrayOfObjects(importPayload.meditations)) {
            for (const meditation of importPayload.meditations) {
                if (typeof meditation['Date'] !== 'string' || typeof meditation['duration'] !== 'number') continue;
                meditations.push({
                    _id: generateObjectId(),
                    username: currentUser,
                    date: meditation['Date'],
                    duration: meditation['duration'],
                    notes: typeof meditation['notes'] === 'string' ? meditation['notes'] : '',
                });
                counts.meditations++;
            }
            await writeCollection(DB_FILES.meditations, meditations);
        }

        // Import emotion logs — validate required array shapes
        if (isArrayOfObjects(importPayload.emotionLogs)) {
            for (const entry of importPayload.emotionLogs) {
                const emotions = entry['emotions'];
                if (typeof entry['date'] !== 'string' || !isEmotionArray(emotions)) continue;
                emotionLogs.push({
                    _id: generateObjectId(),
                    username: currentUser,
                    date: entry['date'],
                    emotions,
                    positiveCount: typeof entry['positiveCount'] === 'number' ? entry['positiveCount'] : 0,
                    negativeCount: typeof entry['negativeCount'] === 'number' ? entry['negativeCount'] : 0,
                    pnRatio: typeof entry['pnRatio'] === 'number' ? entry['pnRatio'] : 0,
                    note: typeof entry['note'] === 'string' ? entry['note'] : undefined,
                    updatedAt: new Date().toISOString(),
                });
                counts.emotionLogs++;
            }
            await writeCollection(DB_FILES.emotionLogs, emotionLogs);
        }

        // Import eightfold path logs — validate required fields
        if (isArrayOfObjects(importPayload.eightfoldPathLogs)) {
            for (const entry of importPayload.eightfoldPathLogs) {
                const paths = entry['paths'];
                if (typeof entry['date'] !== 'string' || !isPathItemArray(paths)) continue;
                eightfoldPathLogs.push({
                    _id: generateObjectId(),
                    username: currentUser,
                    date: entry['date'],
                    paths,
                    completedCount: typeof entry['completedCount'] === 'number' ? entry['completedCount'] : 0,
                    progressPercentage:
                        typeof entry['progressPercentage'] === 'number' ? entry['progressPercentage'] : 0,
                    updatedAt: new Date().toISOString(),
                });
                counts.eightfoldPathLogs++;
            }
            await writeCollection(DB_FILES.eightfoldPathLogs, eightfoldPathLogs);
        }

        return { message: 'Data imported successfully', imported: counts };
    }

    // ─── Recovery codes ─────────────────────────────────────────────────────
    async getRecoveryStatus(): Promise<RecoveryStatus> {
        const { users, index } = await this.getCurrentUserRecord();

        const codes = users[index].recoveryCodes ?? [];
        const usedCount = codes.filter((c) => c.used).length;

        return {
            hasRecoveryCodes: codes.length > 0,
            totalCodes: codes.length,
            usedCodes: usedCount,
            remainingCodes: codes.length - usedCount,
        };
    }

    async generateRecoveryCodes(password: string): Promise<{ codes: string[] }> {
        const { users, index } = await this.getCurrentUserRecord();

        if (!(await verifyPassword(password, users[index].password))) {
            throw new Error('Invalid password');
        }

        const plaintextCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
        const hashedCodes: RecoveryCode[] = [];

        for (const code of plaintextCodes) {
            hashedCodes.push({ hash: await hashPassword(code), salt: '', used: false });
        }

        users[index].recoveryCodes = hashedCodes;
        await writeCollection(DB_FILES.users, users);

        return { codes: plaintextCodes };
    }

    async resetPasswordWithRecoveryCode(
        username: string,
        code: string,
        newPassword: string,
    ): Promise<{ message: string }> {
        await this.ensureInitialized();

        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const users = await readCollection<UserRecord>(DB_FILES.users);
        const user = users.find((u) => u.username === username.trim());
        if (user === undefined) throw new Error('Invalid username or recovery code');

        const codes = user.recoveryCodes ?? [];
        let matchIdx = -1;
        for (let i = 0; i < codes.length; i++) {
            if (!codes[i].used && (await verifyPassword(code.toUpperCase(), codes[i].hash))) {
                matchIdx = i;
                break;
            }
        }

        if (matchIdx === -1) throw new Error('Invalid username or recovery code');

        // Mark code as used and update password
        codes[matchIdx].used = true;
        user.recoveryCodes = codes;
        user.password = await hashPassword(newPassword);
        await writeCollection(DB_FILES.users, users);

        return { message: 'Password reset successfully' };
    }
}
