/**
 * Capacitor DB - JSON file persistence primitives for Capacitor.
 * Owns: file I/O, ID generation, vault location.
 *
 * The Android vault is a fixed folder in public Documents, and that is the
 * point rather than an oversight: it holds nothing but the journal itself — no
 * account, no password hash, no session token — so a location the user can
 * open in a file manager, copy to a desktop vault, or sync with anything else
 * is exactly what the vault model is for. There is no folder picker here
 * because Android has no path-based one to offer.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

import { log } from '@/renderer/utils/logger';

export const DB_FILES = {
    meditations: 'meditations.json',
    emotionLogs: 'emotion_logs.json',
    eightfoldPathLogs: 'eightfold_path_logs.json',
    settings: 'settings.json',
};

/** Public Documents, so the folder is browsable, copyable and backup-visible. */
export const VAULT_DIR = 'ZenGarden';

const STORAGE_DIR = Directory.Documents;

/** Every entry the collection file holds, unchecked: what a rewrite has to put back. */
export async function readCollection(filename: string): Promise<unknown[]> {
    const parsed = await readJson(filename);
    const entries: unknown[] = Array.isArray(parsed) ? parsed : [];
    return entries;
}

export async function writeCollection(filename: string, data: unknown[]): Promise<void> {
    await writeJson(filename, data);
}

/** The stored object, unchecked beyond being one: its fields are the caller's to parse. */
export async function readObject(filename: string): Promise<object | null> {
    const parsed = await readJson(filename);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
}

export async function writeObject(filename: string, data: unknown): Promise<void> {
    await writeJson(filename, data);
}

export function generateObjectId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Math.random().toString(16).substring(2, 18);
    return timestamp + random.padEnd(16, '0');
}

/**
 * Creates the vault folder. Nothing is seeded into it: a missing file reads as
 * an empty collection, so an empty folder is already a valid empty vault.
 */
export async function initializeStorage(): Promise<void> {
    try {
        await Filesystem.mkdir({ path: VAULT_DIR, directory: STORAGE_DIR, recursive: true });
    } catch {
        /* already there — mkdir is the only way to ask, and "exists" is success here */
    }
}

async function readJson(filename: string): Promise<unknown> {
    try {
        const result = await Filesystem.readFile({
            path: `${VAULT_DIR}/${filename}`,
            directory: STORAGE_DIR,
            encoding: Encoding.UTF8,
        });
        if (typeof result.data !== 'string') return null;
        return JSON.parse(result.data);
    } catch {
        /* absent or unreadable — the caller treats both as "nothing stored yet" */
        return null;
    }
}

async function writeJson(filename: string, data: unknown): Promise<void> {
    await Filesystem.writeFile({
        path: `${VAULT_DIR}/${filename}`,
        data: JSON.stringify(data, null, 2),
        directory: STORAGE_DIR,
        encoding: Encoding.UTF8,
    });
    log.info('Wrote vault file', { filename });
}
