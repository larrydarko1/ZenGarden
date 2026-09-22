import { vi, describe, it, expect, beforeEach } from 'vitest';

import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';
import { generateId, readCollection, writeCollection } from '@/main/services/db';

vi.mock('@/main/services/vault', () => ({
    getVaultRoot: (): string => '/vault',
}));

vi.mock('@/main/lib/jsonFile', () => ({
    readJsonFile: vi.fn(),
    writeJsonFile: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('readCollection', () => {
    it('reads the collection from its file inside the vault', () => {
        vi.mocked(readJsonFile).mockReturnValue([{ _id: '1' }]);

        expect(readCollection('emotionLogs')).toEqual([{ _id: '1' }]);
        expect(readJsonFile).toHaveBeenCalledWith('/vault/emotion_logs.json', []);
    });

    it('reads a missing file as an empty collection', () => {
        vi.mocked(readJsonFile).mockReturnValue([]);
        expect(readCollection('meditations')).toEqual([]);
    });

    it('reads a non-array file as an empty collection', () => {
        vi.mocked(readJsonFile).mockReturnValue({ meditations: [] });
        expect(readCollection('meditations')).toEqual([]);
    });

    it.each([
        ['meditations', '/vault/meditations.json'],
        ['emotionLogs', '/vault/emotion_logs.json'],
        ['eightfoldPathLogs', '/vault/eightfold_path_logs.json'],
    ] as const)('resolves %s to %s', (collection, expected) => {
        vi.mocked(readJsonFile).mockReturnValue([]);
        readCollection(collection);
        expect(readJsonFile).toHaveBeenCalledWith(expected, []);
    });
});

describe('writeCollection', () => {
    it('writes the collection to its file inside the vault', () => {
        writeCollection('meditations', [{ _id: '1' }]);
        expect(writeJsonFile).toHaveBeenCalledWith('/vault/meditations.json', [{ _id: '1' }]);
    });
});

describe('generateId', () => {
    it('produces a distinct id on every call', () => {
        const ids = new Set(Array.from({ length: 200 }, () => generateId()));
        expect(ids.size).toBe(200);
    });
});
