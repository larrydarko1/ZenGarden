import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    DB_FILES,
    VAULT_DIR,
    readCollection,
    writeCollection,
    readObject,
    writeObject,
    generateObjectId,
    initializeStorage,
} from '@/renderer/store/adapters/capacitor/db';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock('@capacitor/filesystem', () => ({
    Filesystem: {
        readFile: (...args: unknown[]) => mockReadFile(...args),
        writeFile: (...args: unknown[]) => mockWriteFile(...args),
        mkdir: (...args: unknown[]) => mockMkdir(...args),
    },
    Directory: { Documents: 'DOCUMENTS', Data: 'DATA' },
    Encoding: { UTF8: 'utf8' },
}));

vi.mock('@/renderer/utils/logger', () => ({ log: { info: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
});

/**
 * The Android vault sits in public Documents on purpose. It holds nothing but
 * the journal — no account, no password hash, no session — so a folder the user
 * can open in a file manager and copy to a desktop vault is the whole point.
 */
describe('vault location', () => {
    it('reads and writes public Documents', async () => {
        mockReadFile.mockResolvedValue({ data: '[]' });

        await readCollection('users-are-gone.json');
        await writeCollection('meditations.json', []);

        [...mockReadFile.mock.calls, ...mockWriteFile.mock.calls].forEach(([call]) => {
            expect((call as { directory: string }).directory).toBe('DOCUMENTS');
        });
    });

    it('puts the files at the root of the vault folder, not in a subdirectory', async () => {
        mockReadFile.mockResolvedValue({ data: '[]' });
        await readCollection(DB_FILES.meditations);

        expect(mockReadFile).toHaveBeenCalledWith(
            expect.objectContaining({ path: `${VAULT_DIR}/${DB_FILES.meditations}` }),
        );
    });
});

describe('readCollection', () => {
    it('reads and parses a JSON array', async () => {
        mockReadFile.mockResolvedValue({ data: '[{"id": 1}, {"id": 2}]' });
        expect(await readCollection<{ id: number }>(DB_FILES.meditations)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('reads a missing file as an empty collection', async () => {
        mockReadFile.mockRejectedValue(new Error('File not found'));
        expect(await readCollection(DB_FILES.meditations)).toEqual([]);
    });

    it('reads unparseable contents as an empty collection', async () => {
        mockReadFile.mockResolvedValue({ data: '{not json' });
        expect(await readCollection(DB_FILES.meditations)).toEqual([]);
    });

    it('reads non-string data as an empty collection', async () => {
        mockReadFile.mockResolvedValue({ data: null });
        expect(await readCollection(DB_FILES.meditations)).toEqual([]);
    });

    // A file holding an object is unusable as a collection, not partially usable.
    it('reads an object as an empty collection', async () => {
        mockReadFile.mockResolvedValue({ data: '{"meditations": []}' });
        expect(await readCollection(DB_FILES.meditations)).toEqual([]);
    });
});

describe('writeCollection', () => {
    it('writes indented JSON', async () => {
        await writeCollection(DB_FILES.meditations, [{ a: 1 }]);
        expect(mockWriteFile).toHaveBeenCalledWith(
            expect.objectContaining({
                path: `${VAULT_DIR}/${DB_FILES.meditations}`,
                data: JSON.stringify([{ a: 1 }], null, 2),
            }),
        );
    });
});

describe('readObject', () => {
    it('reads a stored object', async () => {
        mockReadFile.mockResolvedValue({ data: '{"theme":"light"}' });
        expect(await readObject(DB_FILES.settings)).toEqual({ theme: 'light' });
    });

    it('reads a missing file as null', async () => {
        mockReadFile.mockRejectedValue(new Error('File not found'));
        expect(await readObject(DB_FILES.settings)).toBeNull();
    });

    // Settings are an object; an array there is a corrupt file, not settings.
    it('reads an array as null', async () => {
        mockReadFile.mockResolvedValue({ data: '[]' });
        expect(await readObject(DB_FILES.settings)).toBeNull();
    });
});

describe('writeObject', () => {
    it('writes the object to its file', async () => {
        await writeObject(DB_FILES.settings, { theme: 'dark' });
        expect(mockWriteFile).toHaveBeenCalledWith(
            expect.objectContaining({
                path: `${VAULT_DIR}/${DB_FILES.settings}`,
                data: JSON.stringify({ theme: 'dark' }, null, 2),
            }),
        );
    });
});

describe('generateObjectId', () => {
    it('returns a hex string', () => {
        expect(generateObjectId()).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique IDs', () => {
        expect(new Set(Array.from({ length: 50 }, () => generateObjectId())).size).toBe(50);
    });

    it('starts with a timestamp prefix', () => {
        const before = Math.floor(Date.now() / 1000);
        const timestamp = parseInt(generateObjectId().substring(0, 8), 16);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });
});

describe('initializeStorage', () => {
    it('creates the vault folder', async () => {
        await initializeStorage();
        expect(mockMkdir).toHaveBeenCalledWith(
            expect.objectContaining({ path: VAULT_DIR, directory: 'DOCUMENTS', recursive: true }),
        );
    });

    /**
     * Nothing is seeded. A missing file reads as an empty collection, so an
     * empty folder is already a valid empty vault — and seeding would be the
     * one thing that could overwrite a vault the user dropped in by hand.
     */
    it('writes no files', async () => {
        await initializeStorage();
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    // mkdir is the only way to ask, and an existing folder rejects.
    it('treats an existing folder as success', async () => {
        mockMkdir.mockRejectedValue(new Error('Directory exists'));
        await expect(initializeStorage()).resolves.toBeUndefined();
    });
});
