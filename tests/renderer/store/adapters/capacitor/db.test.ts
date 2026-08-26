import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    readCollection,
    writeCollection,
    readSession,
    writeSession,
    generateObjectId,
    initializeStorage,
    DB_FILES,
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
    Directory: { Documents: 'DOCUMENTS' },
    Encoding: { UTF8: 'utf8' },
}));

describe('capacitor/db', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('readCollection', () => {
        it('reads and parses JSON array from file', async () => {
            mockReadFile.mockResolvedValue({ data: '[{"id": 1}, {"id": 2}]' });
            const result = await readCollection<{ id: number }>('users.json');
            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
        });

        it('returns empty array when file does not exist', async () => {
            mockReadFile.mockRejectedValue(new Error('File not found'));
            const result = await readCollection('users.json');
            expect(result).toEqual([]);
        });

        it('returns empty array when data is not a string', async () => {
            mockReadFile.mockResolvedValue({ data: null });
            const result = await readCollection('users.json');
            expect(result).toEqual([]);
        });

        it('uses correct path under ZenGarden/data/', async () => {
            mockReadFile.mockResolvedValue({ data: '[]' });
            await readCollection('users.json');
            expect(mockReadFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'ZenGarden/data/users.json' }));
        });
    });

    describe('writeCollection', () => {
        it('writes JSON with indentation', async () => {
            await writeCollection('test.json', [{ a: 1 }]);
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: JSON.stringify([{ a: 1 }], null, 2),
                    path: 'ZenGarden/data/test.json',
                }),
            );
        });
    });

    describe('readSession', () => {
        it('reads session data from file', async () => {
            mockReadFile.mockResolvedValue({ data: '{"currentUser": "monk"}' });
            const result = await readSession();
            expect(result).toEqual({ currentUser: 'monk' });
        });

        it('returns empty object when file missing', async () => {
            mockReadFile.mockRejectedValue(new Error('not found'));
            const result = await readSession();
            expect(result).toEqual({});
        });

        it('returns empty object when data is non-string', async () => {
            mockReadFile.mockResolvedValue({ data: 123 });
            const result = await readSession();
            expect(result).toEqual({});
        });
    });

    describe('writeSession', () => {
        it('writes session data to the correct file', async () => {
            await writeSession({ currentUser: 'monk' });
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    path: `ZenGarden/data/${DB_FILES.session}`,
                    data: JSON.stringify({ currentUser: 'monk' }, null, 2),
                }),
            );
        });
    });

    describe('generateObjectId', () => {
        it('returns a hex string', () => {
            const id = generateObjectId();
            expect(id).toMatch(/^[0-9a-f]+$/);
        });

        it('generates unique IDs', () => {
            const ids = new Set(Array.from({ length: 50 }, () => generateObjectId()));
            expect(ids.size).toBe(50);
        });

        it('starts with a timestamp prefix', () => {
            const before = Math.floor(Date.now() / 1000);
            const id = generateObjectId();
            const after = Math.floor(Date.now() / 1000);
            const timestampHex = id.substring(0, 8);
            const timestamp = parseInt(timestampHex, 16);
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('initializeStorage', () => {
        it('creates directory and initializes missing files', async () => {
            mockReadFile.mockRejectedValue(new Error('not found'));

            await initializeStorage();

            expect(mockMkdir).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'ZenGarden/data', recursive: true }),
            );
            // Should write initial data for all DB_FILES
            const fileCount = Object.keys(DB_FILES).length;
            expect(mockWriteFile).toHaveBeenCalledTimes(fileCount);
        });

        it('skips files that already exist', async () => {
            mockReadFile.mockResolvedValue({ data: '[]' });

            await initializeStorage();

            expect(mockWriteFile).not.toHaveBeenCalled();
        });

        it('initializes session file with {} and others with []', async () => {
            mockReadFile.mockRejectedValue(new Error('not found'));

            await initializeStorage();

            const sessionCall = mockWriteFile.mock.calls.find(
                (call: unknown[]) => (call[0] as { path: string }).path === `ZenGarden/data/${DB_FILES.session}`,
            );
            expect(sessionCall).toBeDefined();
            expect(JSON.parse((sessionCall![0] as { data: string }).data)).toEqual({});

            const usersCall = mockWriteFile.mock.calls.find(
                (call: unknown[]) => (call[0] as { path: string }).path === `ZenGarden/data/${DB_FILES.users}`,
            );
            expect(usersCall).toBeDefined();
            expect(JSON.parse((usersCall![0] as { data: string }).data)).toEqual([]);
        });
    });
});
