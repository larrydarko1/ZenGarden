import fs from 'fs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { readJsonFile, writeJsonFile } from '@/main/lib/jsonFile';

const state = vi.hoisted(() => ({
    /** What the next readFileSync returns, keyed by full path. */
    files: {} as Record<string, string>,
}));

vi.mock('fs', () => {
    const api = {
        readFileSync: (filePath: string): string => {
            const contents = state.files[String(filePath)];
            if (contents === undefined) throw new Error('ENOENT');
            return contents;
        },
        writeFileSync: vi.fn(),
        chmodSync: vi.fn(),
        renameSync: vi.fn(),
    };
    return { default: api, ...api };
});

beforeEach(() => {
    state.files = {};
    vi.clearAllMocks();
});

describe('readJsonFile', () => {
    it('returns the parsed contents', () => {
        state.files['/vault/settings.json'] = JSON.stringify({ theme: 'light' });
        expect(readJsonFile('/vault/settings.json', {})).toEqual({ theme: 'light' });
    });

    it('falls back when the file is missing', () => {
        expect(readJsonFile('/vault/absent.json', { fallback: true })).toEqual({ fallback: true });
    });

    // A half-written file is indistinguishable from a corrupt one at this level,
    // and both have to read as "nothing usable" rather than throw into a handler.
    it('falls back on unparseable JSON', () => {
        state.files['/vault/broken.json'] = '{not json';
        expect(readJsonFile('/vault/broken.json', [])).toEqual([]);
    });
});

describe('writeJsonFile', () => {
    it('writes through a tmp file and renames it into place', () => {
        writeJsonFile('/vault/meditations.json', [{ date: '2026-01-01' }]);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            '/vault/meditations.json.tmp',
            JSON.stringify([{ date: '2026-01-01' }], null, 2),
            { encoding: 'utf8', mode: 0o600 },
        );
        expect(fs.renameSync).toHaveBeenCalledWith('/vault/meditations.json.tmp', '/vault/meditations.json');
    });

    // `mode` on writeFileSync applies only when the file is created, so a .tmp
    // orphaned by an earlier crash would keep its old mode and be renamed into
    // place at 0644. The explicit chmod is what stops that.
    it('applies the mode outright, not only via the create flag', () => {
        writeJsonFile('/vault/meditations.json', []);
        expect(fs.chmodSync).toHaveBeenCalledWith('/vault/meditations.json.tmp', 0o600);
    });

    it('renames only after the contents are written', () => {
        writeJsonFile('/vault/meditations.json', []);

        const writeOrder = vi.mocked(fs.writeFileSync).mock.invocationCallOrder[0];
        const renameOrder = vi.mocked(fs.renameSync).mock.invocationCallOrder[0];
        expect(writeOrder).toBeLessThan(renameOrder);
    });
});
