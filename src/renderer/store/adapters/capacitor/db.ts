/**
 * Capacitor DB - JSON file persistence primitives for Capacitor.
 * Owns: file I/O, session management, ID generation, storage initialization.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { log } from '@/renderer/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionData = {
    currentUser?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const DB_FILES = {
    users: 'users.json',
    meditations: 'meditations.json',
    emotionLogs: 'emotion_logs.json',
    eightfoldPathLogs: 'eightfold_path_logs.json',
    session: 'session.json',
};

// ─── Collection I/O ───────────────────────────────────────────────────────────

export async function readCollection<T>(filename: string): Promise<T[]> {
    try {
        const result = await Filesystem.readFile({
            path: `ZenGarden/data/${filename}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        const data = typeof result.data === 'string' ? result.data : '';
        const parsed: unknown = JSON.parse(data);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

export async function writeCollection<T>(filename: string, data: T[]): Promise<void> {
    await Filesystem.writeFile({
        path: `ZenGarden/data/${filename}`,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
    });
}

// ─── Session I/O ──────────────────────────────────────────────────────────────

export async function readSession(): Promise<SessionData> {
    try {
        const result = await Filesystem.readFile({
            path: `ZenGarden/data/${DB_FILES.session}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        const data = typeof result.data === 'string' ? result.data : '{}';
        const parsed = JSON.parse(data) as SessionData | null;
        return parsed ?? {};
    } catch {
        return {};
    }
}

export async function writeSession(session: SessionData): Promise<void> {
    await Filesystem.writeFile({
        path: `ZenGarden/data/${DB_FILES.session}`,
        data: JSON.stringify(session, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
    });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function generateObjectId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Math.random().toString(16).substring(2, 18);
    return timestamp + random.padEnd(16, '0');
}

// ─── Initialization ───────────────────────────────────────────────────────────

export async function initializeStorage(): Promise<void> {
    try {
        await Filesystem.mkdir({
            path: 'ZenGarden/data',
            directory: Directory.Documents,
            recursive: true,
        });

        for (const [key, filename] of Object.entries(DB_FILES)) {
            try {
                await Filesystem.readFile({
                    path: `ZenGarden/data/${filename}`,
                    directory: Directory.Documents,
                });
            } catch {
                const initialData = key === 'session' ? {} : [];
                await Filesystem.writeFile({
                    path: `ZenGarden/data/${filename}`,
                    data: JSON.stringify(initialData, null, 2),
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8,
                });
                log.info('Created collection file', { filename });
            }
        }
    } catch (error) {
        log.error('Storage initialization failed', error);
    }
}
