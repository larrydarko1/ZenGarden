import { vi, describe, it, expect, beforeEach } from 'vitest';
import { normalizeDoc, readCollection, readSession } from '@/main/services/db';

/** What the next fs.readFileSync returns, keyed by the file the module asks for. */
const state = vi.hoisted(() => ({ files: {} as Record<string, string> }));

vi.mock('electron', () => ({
    app: {
        getPath: () => '/tmp/zengarden-test',
    },
}));

vi.mock('fs', () => {
    const readFileSync = (filePath: string): string => {
        const name = String(filePath).split('/').pop() ?? '';
        const contents = state.files[name];
        if (contents === undefined) throw new Error('ENOENT');
        return contents;
    };
    const api = {
        existsSync: () => true,
        readFileSync,
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
        unlinkSync: vi.fn(),
    };
    return { default: api, ...api };
});

beforeEach(() => {
    state.files = {};
});

describe('readSession', () => {
    it('returns the stored session when both halves are present', () => {
        state.files['session.json'] = JSON.stringify({ username: 'alice', token: 'tok' });
        expect(readSession()).toEqual({ username: 'alice', token: 'tok' });
    });

    it('reads a half-written session as signed out', () => {
        state.files['session.json'] = JSON.stringify({ username: 'alice' });
        expect(readSession()).toBeNull();
    });

    it('reads an empty username as signed out rather than as a user named ""', () => {
        state.files['session.json'] = JSON.stringify({ username: '', token: 'tok' });
        expect(readSession()).toBeNull();
    });

    it('reads a session file of the wrong shape as signed out', () => {
        state.files['session.json'] = JSON.stringify(['alice', 'tok']);
        expect(readSession()).toBeNull();
    });

    it('reads unparseable JSON as signed out', () => {
        state.files['session.json'] = '{not json';
        expect(readSession()).toBeNull();
    });

    it('reads a missing file as signed out', () => {
        expect(readSession()).toBeNull();
    });
});

describe('readCollection', () => {
    it('normalises every document it returns', () => {
        state.files['users.json'] = JSON.stringify([{ _id: { $oid: 'abc' }, Username: 'Legacy' }]);
        const users = readCollection<{ _id: string; username: string }>('users');
        expect(users).toEqual([{ _id: 'abc', username: 'Legacy', Username: 'Legacy' }]);
    });

    it('returns nothing for a collection file that is not an array', () => {
        state.files['users.json'] = JSON.stringify({ users: [] });
        expect(readCollection('users')).toEqual([]);
    });

    it('returns nothing for unparseable JSON', () => {
        state.files['users.json'] = '[[[';
        expect(readCollection('users')).toEqual([]);
    });

    it('returns nothing for a missing file', () => {
        expect(readCollection('meditations')).toEqual([]);
    });
});

describe('normalizeDoc', () => {
    it('passes through a plain document unchanged', () => {
        const doc = { _id: 'abc', username: 'test', date: '2025-01-01' };
        const result = normalizeDoc(doc);
        expect(result).toEqual(doc);
    });

    it('flattens a MongoDB $oid wrapper into a plain string _id', () => {
        const doc = { _id: { $oid: '507f1f77bcf86cd799439011' }, name: 'x' };
        const result = normalizeDoc(doc);
        expect(result._id).toBe('507f1f77bcf86cd799439011');
    });

    it('flattens a MongoDB $date wrapper into a plain string', () => {
        const doc = { _id: '1', createdAt: { $date: '2024-06-15T10:00:00Z' } };
        const result = normalizeDoc(doc);
        expect(result['createdAt']).toBe('2024-06-15T10:00:00Z');
    });

    it('flattens multiple $date fields', () => {
        const doc = {
            _id: '1',
            date: { $date: '2024-01-01' },
            updatedAt: { $date: '2024-06-15' },
        };
        const result = normalizeDoc(doc);
        expect(result['date']).toBe('2024-01-01');
        expect(result['updatedAt']).toBe('2024-06-15');
    });

    it('aliases capitalised "Date" to lowercase "date" for legacy records', () => {
        const doc = { _id: '1', Date: '2025-03-01' };
        const result = normalizeDoc(doc);
        expect(result['date']).toBe('2025-03-01');
    });

    it('aliases capitalised "Username" to lowercase "username" for legacy records', () => {
        const doc = { _id: '1', Username: 'OldUser' };
        const result = normalizeDoc(doc);
        expect(result['username']).toBe('OldUser');
    });

    it('does not overwrite existing lowercase fields with capitalised aliases', () => {
        const doc = { _id: '1', date: '2025-01-01', Date: '2024-01-01', username: 'new', Username: 'old' };
        const result = normalizeDoc(doc);
        expect(result['date']).toBe('2025-01-01');
        expect(result['username']).toBe('new');
    });

    it('handles all normalisations in a single document', () => {
        const doc = {
            _id: { $oid: 'abc123' },
            Username: 'TestUser',
            Date: { $date: '2024-12-25T00:00:00Z' },
            value: 42,
        };
        const result = normalizeDoc(doc);
        expect(result._id).toBe('abc123');
        expect(result['username']).toBe('TestUser');
        expect(result['date']).toBe('2024-12-25T00:00:00Z');
        expect(result['value']).toBe(42);
    });

    it('does not mutate the original document', () => {
        const doc = { _id: { $oid: 'abc' }, Username: 'x' };
        const original = { ...doc, _id: { ...doc._id } };
        normalizeDoc(doc);
        expect(doc._id).toEqual(original._id);
    });
});
