/**
 * db — JSON collection I/O inside the open vault.
 * Owns: collection filenames, reads, writes, document ids.
 * Does NOT own: which folder is the vault (vault.ts), IPC registration (data.ts).
 * Every collection is one plain JSON array in the vault folder. A missing file
 * is an empty collection rather than an error, so an empty folder is a valid
 * empty vault and nothing has to be seeded before the first write.
 */

import path from 'path';
import { z } from 'zod';
import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';
import { getVaultRoot } from '@/main/services/vault';

export type CollectionName = 'meditations' | 'emotionLogs' | 'eightfoldPathLogs';

export type RawDoc = {
    _id?: string;
    [key: string]: unknown;
};

const FILE_NAMES: Record<CollectionName, string> = {
    meditations: 'meditations.json',
    emotionLogs: 'emotion_logs.json',
    eightfoldPathLogs: 'eightfold_path_logs.json',
};

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function readCollection<T>(collection: CollectionName): T[] {
    const raw = readJsonFile<unknown>(collectionPath(collection), []);
    // A collection file that is not a JSON array is unusable, not partially
    // usable: reading it as one would hand every caller a `.map` that throws.
    const parsed = z.array(z.unknown()).safeParse(raw);
    return parsed.success ? (parsed.data as T[]) : [];
}

export function writeCollection<T>(collection: CollectionName, data: T[]): void {
    writeJsonFile(collectionPath(collection), data);
}

function collectionPath(collection: CollectionName): string {
    return path.join(getVaultRoot(), FILE_NAMES[collection]);
}
