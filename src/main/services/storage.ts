// storage — JSON file persistence for the Electron main process.
// Owns: all file I/O, password hashing, session management, IPC handler registration.
// Does NOT own: renderer-side state (src/renderer/store/), bridge API (src/preload/index.ts).

import { app } from 'electron';
import type { IpcMain } from 'electron';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// ─── Paths ───────────────────────────────────────────────────────────────────

const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

// Clean up old SQLite files left from a previous migration
const legacyFiles = [
    path.join(userDataPath, 'zengarden.db'),
    path.join(userDataPath, 'zengarden.db-shm'),
    path.join(userDataPath, 'zengarden.db-wal'),
];
legacyFiles.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
});

type CollectionName = 'users' | 'meditations' | 'emotionLogs' | 'eightfoldPathLogs';

const dbFiles: Record<CollectionName | 'session', string> = {
    users: path.join(dataPath, 'users.json'),
    meditations: path.join(dataPath, 'meditations.json'),
    emotionLogs: path.join(dataPath, 'emotion_logs.json'),
    eightfoldPathLogs: path.join(dataPath, 'eightfold_path_logs.json'),
    session: path.join(dataPath, 'session.json'),
};

// Seed empty files on first run
(Object.entries(dbFiles) as [keyof typeof dbFiles, string][]).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
        const seed = key === 'session' ? '{}' : '[]';
        fs.writeFileSync(filePath, seed, 'utf8');
    }
});

// ─── Internal types ───────────────────────────────────────────────────────────

interface MongoDate {
    $date: string;
}

interface MongoId {
    $oid: string;
}

// Raw document shape that may arrive from a legacy MongoDB export
interface RawDoc {
    _id?: string | MongoId;
    [key: string]: unknown;
}

interface StoredUser {
    _id: string;
    username: string;
    // Argon2 stores the full hash string; PBKDF2 stores split fields
    password?: string;
    passwordHash?: string;
    salt?: string;
    theme: string;
    language: string;
    stats: {
        totalSessions: number;
        totalMinutes: number;
        currentStreak: number;
        longestStreak: number;
    };
    createdAt: string;
}

interface Session {
    username: string;
    token: string;
}

// ─── Collection helpers ───────────────────────────────────────────────────────

// Normalise a raw MongoDB-exported document: flatten {$oid}, {$date} wrappers
// and alias capitalised field names produced by a legacy schema.
function normalizeDoc(doc: RawDoc): RawDoc {
    const out: RawDoc = { ...doc };

    if (out._id && typeof out._id === 'object' && (out._id as MongoId).$oid) {
        out._id = (out._id as MongoId).$oid;
    }

    for (const key of Object.keys(out)) {
        const val = out[key];
        if (val && typeof val === 'object' && (val as MongoDate).$date) {
            out[key] = (val as MongoDate).$date;
        }
    }

    // Alias capitalised legacy fields so consumer code can use lowercase
    if (out['Date'] && !out['date']) out['date'] = out['Date'];
    if (out['Username'] && !out['username']) out['username'] = out['Username'];

    return out;
}

function readCollection<T>(collection: CollectionName): T[] {
    try {
        const raw = fs.readFileSync(dbFiles[collection], 'utf8');
        const docs = JSON.parse(raw) as T[];
        return docs.map((d) => normalizeDoc(d as RawDoc) as T);
    } catch {
        return [];
    }
}

// Atomic write: write to a .tmp file then rename — prevents data corruption on crash
function writeCollection<T>(collection: CollectionName, data: T[]): void {
    const target = dbFiles[collection];
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, target);
}

function readSession(): Session | null {
    try {
        const raw = fs.readFileSync(dbFiles.session, 'utf8');
        const saved = JSON.parse(raw) as Partial<Session>;
        if (saved.username && saved.token) return saved as Session;
        return null;
    } catch {
        return null;
    }
}

// Atomic session write
function saveSession(session: Session | null): void {
    const tmp = dbFiles.session + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(session ?? {}, null, 2), 'utf8');
    fs.renameSync(tmp, dbFiles.session);
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Hash with Argon2 if available (preferred), fall back to PBKDF2
async function hashPassword(password: string): Promise<string | { hash: string; salt: string }> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const argon2 = require('argon2') as { hash: (p: string) => Promise<string> };
        return await argon2.hash(password);
    } catch {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
        return { hash, salt };
    }
}

function hashPasswordPbkdf2(password: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt ?? crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha256').toString('hex');
    return { hash, salt: useSalt };
}

async function verifyPassword(password: string, user: StoredUser): Promise<boolean> {
    // Argon2 path — full hash string stored in user.password
    if (user.password?.startsWith('$argon2')) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const argon2 = require('argon2') as { verify: (h: string, p: string) => Promise<boolean> };
            return await argon2.verify(user.password, password);
        } catch {
            return false;
        }
    }

    // PBKDF2 path — split hash + salt fields
    if (user.passwordHash && user.salt) {
        const { hash } = hashPasswordPbkdf2(password, user.salt);
        return hash === user.passwordHash;
    }

    return false;
}

// ─── Session state ────────────────────────────────────────────────────────────

let currentSession: Session | null = readSession();

// ─── IPC handlers ─────────────────────────────────────────────────────────────

type HandlerFn = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;

const storageHandlers: Record<string, HandlerFn> = {
    // ── Auth ─────────────────────────────────────────────────────────────────

    'storage:register': async (_event, username, password, theme = 'dark', language = 'en') => {
        const trimmed = (username as string).trim();
        if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
            throw new Error('Username must be 3-32 alphanumeric characters');
        }

        const users = readCollection<StoredUser>('users');
        if (users.find((u) => u.username === trimmed)) {
            throw new Error('Username already exists');
        }

        const hashed = await hashPassword(password as string);

        const newUser: StoredUser = {
            _id: generateId(),
            username: trimmed,
            ...(typeof hashed === 'string' ? { password: hashed } : { passwordHash: hashed.hash, salt: hashed.salt }),
            theme: theme as string,
            language: language as string,
            stats: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        writeCollection('users', users);

        const token = generateToken();
        currentSession = { username: trimmed, token };
        saveSession(currentSession);

        return { message: 'Registration successful', user: { username: trimmed, theme, language }, token };
    },

    'storage:login': async (_event, username, password) => {
        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === (username as string).trim());

        if (!user || !(await verifyPassword(password as string, user))) {
            throw new Error('Invalid username or password');
        }

        const token = generateToken();
        currentSession = { username: user.username, token };
        saveSession(currentSession);

        return {
            message: 'Login successful',
            user: { username: user.username, theme: user.theme ?? 'dark', language: user.language ?? 'en' },
            token,
        };
    },

    'storage:getCurrentUser': async () => {
        if (!currentSession) return null;

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) return null;

        return { username: user.username, theme: user.theme, language: user.language };
    },

    'storage:logout': async () => {
        currentSession = null;
        saveSession(null);
        return { message: 'Logged out successfully' };
    },

    'storage:deleteAccount': async (_event, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const idx = users.findIndex((u) => u.username === currentSession!.username);
        const user = users[idx];

        if (!(await verifyPassword(password as string, user))) {
            throw new Error('Invalid password');
        }

        const username = currentSession.username;
        users.splice(idx, 1);
        writeCollection('users', users);

        // Remove all records for this user across every collection
        (['meditations', 'emotionLogs', 'eightfoldPathLogs'] as CollectionName[]).forEach((col) => {
            const items = readCollection<RawDoc>(col);
            writeCollection(
                col,
                items.filter((item) => item['username'] !== username && item['Username'] !== username),
            );
        });

        currentSession = null;
        saveSession(null);
        return { message: 'Account deleted successfully' };
    },

    // ── Settings ──────────────────────────────────────────────────────────────

    'storage:updateUsername': async (_event, newUsername, password) => {
        if (!currentSession) throw new Error('Not authenticated');

        const trimmed = (newUsername as string).trim();
        if (!/^[a-zA-Z0-9]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 32) {
            throw new Error('Username must be 3-32 alphanumeric characters');
        }

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        if (!(await verifyPassword(password as string, user))) throw new Error('Invalid password');

        const oldUsername = currentSession.username;
        user.username = trimmed;
        writeCollection('users', users);

        // Propagate username rename to all related collections
        (['meditations', 'emotionLogs', 'eightfoldPathLogs'] as CollectionName[]).forEach((col) => {
            const items = readCollection<RawDoc>(col);
            items.forEach((item) => {
                if (item['username'] === oldUsername) item['username'] = trimmed;
                if (item['Username'] === oldUsername) item['Username'] = trimmed;
            });
            writeCollection(col, items);
        });

        currentSession.username = trimmed;
        saveSession(currentSession);
        return { message: 'Username updated successfully' };
    },

    'storage:updatePassword': async (_event, currentPassword, newPassword) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        if (!(await verifyPassword(currentPassword as string, user))) {
            throw new Error('Current password is incorrect');
        }

        const { hash, salt } = hashPasswordPbkdf2(newPassword as string);
        user.passwordHash = hash;
        user.salt = salt;
        // Clear any lingering Argon2 field so verify always uses PBKDF2 path after a password change
        delete user.password;
        writeCollection('users', users);
        return { message: 'Password updated successfully' };
    },

    'storage:updateTheme': async (_event, theme) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        user.theme = theme as string;
        writeCollection('users', users);
        return { message: 'Theme updated successfully' };
    },

    'storage:updateLanguage': async (_event, language) => {
        if (!currentSession) throw new Error('Not authenticated');

        const users = readCollection<StoredUser>('users');
        const user = users.find((u) => u.username === currentSession!.username);
        if (!user) throw new Error('User not found');

        user.language = language as string;
        writeCollection('users', users);
        return { message: 'Language updated successfully' };
    },

    // ── Meditations ───────────────────────────────────────────────────────────

    'storage:createMeditation': async (_event, date, duration, notes) => {
        if (!currentSession) throw new Error('Not authenticated');

        const meditations = readCollection<RawDoc>('meditations');
        const newMeditation = {
            _id: generateId(),
            Username: currentSession.username,
            Date: date,
            duration,
            notes,
            createdAt: new Date().toISOString(),
        };

        meditations.push(newMeditation);
        writeCollection('meditations', meditations);
        return newMeditation;
    },

    'storage:getMeditations': async () => {
        if (!currentSession) throw new Error('Not authenticated');

        const meditations = readCollection<RawDoc>('meditations');
        return meditations
            .filter((m) => m['Username'] === currentSession!.username || m['username'] === currentSession!.username)
            .sort((a, b) => new Date(b['Date'] as string).getTime() - new Date(a['Date'] as string).getTime());
    },

    // ── Emotion logs ──────────────────────────────────────────────────────────

    'storage:saveEmotionLog': async (_event, date, emotions, note) => {
        if (!currentSession) throw new Error('Not authenticated');

        const emotionList = emotions as Array<{ type: string; name: string }>;
        const positiveCount = emotionList.filter((e) => e.type === 'positive').length;
        const negativeCount = emotionList.filter((e) => e.type === 'negative').length;
        const total = positiveCount + negativeCount;
        const pnRatio = total > 0 ? positiveCount / total : 0;

        const logs = readCollection<RawDoc>('emotionLogs');
        const existingIdx = logs.findIndex((l) => l['username'] === currentSession!.username && l['date'] === date);

        const emotionLog = {
            _id: existingIdx >= 0 ? logs[existingIdx]['_id'] : generateId(),
            username: currentSession.username,
            date,
            emotions,
            positiveCount,
            negativeCount,
            pnRatio,
            ...(note ? { note } : {}),
            updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
            logs[existingIdx] = emotionLog;
        } else {
            logs.push(emotionLog);
        }

        writeCollection('emotionLogs', logs);
        return emotionLog;
    },

    'storage:getEmotionLogs': async (_event, query = {}) => {
        if (!currentSession) throw new Error('Not authenticated');

        const q = query as { startDate?: string; endDate?: string; limit?: number };
        let logs = readCollection<RawDoc>('emotionLogs').filter((l) => l['username'] === currentSession!.username);

        if (q.startDate) logs = logs.filter((l) => (l['date'] as string) >= q.startDate!);
        if (q.endDate) logs = logs.filter((l) => (l['date'] as string) <= q.endDate!);
        logs.sort((a, b) => (b['date'] as string).localeCompare(a['date'] as string));
        if (q.limit) logs = logs.slice(0, q.limit);

        return logs;
    },

    'storage:getEmotionAnalytics': async (_event, days = 30) => {
        if (!currentSession) throw new Error('Not authenticated');

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days as number));
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const logs = readCollection<RawDoc>('emotionLogs')
            .filter((l) => l['username'] === currentSession!.username && (l['date'] as string) >= cutoffStr)
            .sort((a, b) => (a['date'] as string).localeCompare(b['date'] as string));

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
                trends: [],
            };
        }

        const totals = logs.reduce(
            (acc, l) => ({
                positive: acc.positive + (l['positiveCount'] as number),
                negative: acc.negative + (l['negativeCount'] as number),
                ratio: acc.ratio + (l['pnRatio'] as number),
            }),
            { positive: 0, negative: 0, ratio: 0 } as { positive: number; negative: number; ratio: number },
        );

        let positiveDays = 0;
        let negativeDays = 0;
        const uniqueEmotions = new Set<string>();
        const emotionCounts: Record<string, { name: string; type: string; count: number }> = {};

        logs.forEach((l) => {
            if ((l['pnRatio'] as number) >= 0.5) positiveDays++;
            else negativeDays++;

            const emotions = l['emotions'] as Array<{ name: string; type: string }> | undefined;
            emotions?.forEach((e) => {
                uniqueEmotions.add(e.name);
                if (!emotionCounts[e.name]) emotionCounts[e.name] = { name: e.name, type: e.type, count: 0 };
                emotionCounts[e.name].count++;
            });
        });

        return {
            totalDays: logs.length,
            averagePositiveCount: totals.positive / logs.length,
            averageNegativeCount: totals.negative / logs.length,
            averagePNRatio: totals.ratio / logs.length,
            emotionDiversity: uniqueEmotions.size,
            positiveDays,
            negativeDays,
            topEmotions: Object.values(emotionCounts).sort((a, b) => b.count - a.count),
            trends: logs.map((l) => ({ date: l['date'], pnRatio: l['pnRatio'] })),
        };
    },

    // ── Eightfold path ────────────────────────────────────────────────────────

    'storage:saveEightfoldPathLog': async (_event, date, paths) => {
        if (!currentSession) throw new Error('Not authenticated');

        const pathList = paths as Array<{ note?: string }>;
        const completedCount = pathList.filter((p) => p.note?.trim()).length;
        const progressPercentage = (completedCount / 8) * 100;

        const logs = readCollection<RawDoc>('eightfoldPathLogs');
        const existingIdx = logs.findIndex((l) => l['username'] === currentSession!.username && l['date'] === date);

        const pathLog = {
            _id: existingIdx >= 0 ? logs[existingIdx]['_id'] : generateId(),
            username: currentSession.username,
            date,
            paths,
            completedCount,
            progressPercentage,
            updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
            logs[existingIdx] = pathLog;
        } else {
            logs.push(pathLog);
        }

        writeCollection('eightfoldPathLogs', logs);
        return pathLog;
    },

    'storage:getEightfoldPathLogs': async (_event, query = {}) => {
        if (!currentSession) throw new Error('Not authenticated');

        const q = query as { startDate?: string; endDate?: string; limit?: number };
        let logs = readCollection<RawDoc>('eightfoldPathLogs').filter(
            (l) => l['username'] === currentSession!.username,
        );

        if (q.startDate) logs = logs.filter((l) => (l['date'] as string) >= q.startDate!);
        if (q.endDate) logs = logs.filter((l) => (l['date'] as string) <= q.endDate!);
        logs.sort((a, b) => (b['date'] as string).localeCompare(a['date'] as string));
        if (q.limit) logs = logs.slice(0, q.limit);

        return logs;
    },

    'storage:getEightfoldPathAnalytics': async (_event, days = 30) => {
        if (!currentSession) throw new Error('Not authenticated');

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days as number));
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const logs = readCollection<RawDoc>('eightfoldPathLogs').filter(
            (l) => l['username'] === currentSession!.username && (l['date'] as string) >= cutoffStr,
        );

        if (logs.length === 0) {
            return { totalDays: 0, averageCompletedCount: 0, averageProgressPercentage: 0 };
        }

        const totals = logs.reduce(
            (acc, l) => ({
                completed: acc.completed + (l['completedCount'] as number),
                progress: acc.progress + (l['progressPercentage'] as number),
            }),
            { completed: 0, progress: 0 } as { completed: number; progress: number },
        );

        return {
            totalDays: logs.length,
            averageCompletedCount: totals.completed / logs.length,
            averageProgressPercentage: totals.progress / logs.length,
        };
    },
};

// ─── Registration ─────────────────────────────────────────────────────────────

export function setupStorageHandlers(ipcMain: IpcMain): void {
    for (const [channel, handler] of Object.entries(storageHandlers)) {
        ipcMain.handle(channel, handler);
    }
}
