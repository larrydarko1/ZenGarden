import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateId, readCollection, writeCollection } from '@/main/services/db';
import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';

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

    // The whole point of the vault model: a folder with nothing in it is a valid
    // empty vault, so nothing has to be seeded before the first write.
    it('reads a missing file as an empty collection', () => {
        vi.mocked(readJsonFile).mockReturnValue([]);
        expect(readCollection('meditations')).toEqual([]);
    });

    /**
     * A collection file that is not a JSON array is unusable, not partially
     * usable — reading it as one would hand every caller a `.map` that throws.
     */
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
