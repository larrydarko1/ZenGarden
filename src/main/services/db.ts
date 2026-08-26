/**
 * db — JSON file persistence primitives for the Electron main process.
 * Owns: file paths, collection read/write, session read/write, document normalisation.
 * Does NOT own: IPC registration (storage.ts), crypto (crypto.ts).
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

export type CollectionName = 'users' | 'meditations' | 'emotionLogs' | 'eightfoldPathLogs';

export type StoredUser = {
    _id: string;
    username: string;
    password?: string; // Argon2 stores the full hash string; PBKDF2 stores split fields
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
    // Each code is stored as its PBKDF2 hash so plaintext is never persisted
    recoveryCodes?: { hash: string; salt: string; used: boolean }[];
    createdAt: string;
};

/**
 * A session is only a session when both halves are present and non-empty.
 * The file is user-writable, so a hand-edited or half-written one has to read
 * as "signed out" rather than as a user named "".
 */
const SessionSchema = z.object({
    username: z.string().min(1),
    token: z.string().min(1),
});

export type Session = z.infer<typeof SessionSchema>;

export type RawDoc = {
    _id?: string | MongoId;
    [key: string]: unknown;
};

type MongoDate = {
    $date: string;
};

type MongoId = {
    $oid: string;
};

const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

const legacyFiles = [
    path.join(userDataPath, 'zengarden.db'),
    path.join(userDataPath, 'zengarden.db-shm'),
    path.join(userDataPath, 'zengarden.db-wal'),
];

const dbFiles: Record<CollectionName | 'session', string> = {
    users: path.join(dataPath, 'users.json'),
    meditations: path.join(dataPath, 'meditations.json'),
    emotionLogs: path.join(dataPath, 'emotion_logs.json'),
    eightfoldPathLogs: path.join(dataPath, 'eightfold_path_logs.json'),
    session: path.join(dataPath, 'session.json'),
};

// Flatten {$oid}, {$date} wrappers and alias capitalised legacy field names.
export function normalizeDoc(doc: RawDoc): RawDoc {
    const out: RawDoc = { ...doc };

    if (isIdWrapper(out._id)) {
        out._id = out._id.$oid;
    }

    for (const key of Object.keys(out)) {
        const val = out[key];
        if (isDateWrapper(val)) {
            out[key] = val.$date;
        }
    }

    if (hasValue(out['Date']) && !hasValue(out['date'])) out['date'] = out['Date'];
    if (hasValue(out['Username']) && !hasValue(out['username'])) out['username'] = out['Username'];

    return out;
}

export function readCollection<T>(collection: CollectionName): T[] {
    try {
        const raw = fs.readFileSync(dbFiles[collection], 'utf8');
        // A collection file that is not a JSON array is unusable, not partially
        // usable: reading it as one would hand every caller a `.map` that throws.
        const parsed = z.array(z.unknown()).safeParse(JSON.parse(raw));
        if (!parsed.success) return [];
        return parsed.data.map((doc) => normalizeDoc(doc as RawDoc) as T);
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

export function readSession(): Session | null {
    try {
        const raw = fs.readFileSync(dbFiles.session, 'utf8');
        const parsed = SessionSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
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

function isIdWrapper(value: unknown): value is MongoId {
    return typeof value === 'object' && value !== null && typeof (value as MongoId).$oid === 'string';
}

function isDateWrapper(value: unknown): value is MongoDate {
    return typeof value === 'object' && value !== null && typeof (value as MongoDate).$date === 'string';
}

// Legacy documents alias a capitalised field only when the lowercase one carries nothing.
function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

// Clean up old SQLite files left from a previous migration
legacyFiles.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
});

// Seed empty files on first run
(Object.entries(dbFiles) as [keyof typeof dbFiles, string][]).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
        const seed = key === 'session' ? '{}' : '[]';
        fs.writeFileSync(filePath, seed, 'utf8');
    }
});
