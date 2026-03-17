// @vitest-environment node

// Mock the 'electron' module before importing db.ts — db.ts calls app.getPath()
// and creates directories at module load time, which would fail without Electron.
import { vi, describe, it, expect } from 'vitest';

vi.mock('electron', () => ({
    app: {
        getPath: () => '/tmp/zengarden-test',
    },
}));

// Also mock fs to prevent real file operations during module init
vi.mock('fs', () => ({
    default: {
        existsSync: () => true,
        readFileSync: () => '[]',
        writeFileSync: vi.fn(),
        renameSync: vi.fn(),
        mkdirSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: () => true,
    readFileSync: () => '[]',
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

import { normalizeDoc } from '../../../src/main/services/db';

// ─── normalizeDoc ─────────────────────────────────────────────────────────────

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
