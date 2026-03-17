// db — JSON file persistence primitives for the Electron main process.
// Owns: file paths, collection read/write, session read/write, document normalisation.
// Does NOT own: IPC registration (storage.ts), crypto (crypto.ts).

import { app } from 'electron';
import path from 'path';
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type CollectionName = 'users' | 'meditations' | 'emotionLogs' | 'eightfoldPathLogs';

export interface StoredUser {
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

export interface Session {
    username: string;
    token: string;
}

interface MongoDate {
    $date: string;
}

interface MongoId {
    $oid: string;
}

// Raw document shape that may arrive from a legacy MongoDB export
export interface RawDoc {
    _id?: string | MongoId;
    [key: string]: unknown;
}

export type HandlerFn = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;

// ─── File registry ────────────────────────────────────────────────────────────

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

// ─── Normalisation ────────────────────────────────────────────────────────────

// Flatten {$oid}, {$date} wrappers and alias capitalised legacy field names.
export function normalizeDoc(doc: RawDoc): RawDoc {
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

    if (out['Date'] && !out['date']) out['date'] = out['Date'];
    if (out['Username'] && !out['username']) out['username'] = out['Username'];

    return out;
}

// ─── Collection helpers ───────────────────────────────────────────────────────

export function readCollection<T>(collection: CollectionName): T[] {
    try {
        const raw = fs.readFileSync(dbFiles[collection], 'utf8');
        const docs = JSON.parse(raw) as T[];
        return docs.map((d) => normalizeDoc(d as RawDoc) as T);
    } catch {
        return [];
    }
}

// Atomic write: write to .tmp then rename — prevents data corruption on crash
export function writeCollection<T>(collection: CollectionName, data: T[]): void {
    const target = dbFiles[collection];
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, target);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export function readSession(): Session | null {
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
export function saveSession(session: Session | null): void {
    const tmp = dbFiles.session + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(session ?? {}, null, 2), 'utf8');
    fs.renameSync(tmp, dbFiles.session);
}
