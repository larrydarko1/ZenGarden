/**
 * jsonFile — atomic, owner-only JSON reads and writes.
 * Owns: the tmp-file-then-rename write, the 0600 mode, the "unreadable file
 * reads as absent" rule.
 * Does NOT own: what any particular file contains (vault.ts, db.ts).
 * Both the vault's collections and the app's own state file need the same
 * primitive, and db.ts already imports the vault root from vault.ts — so it
 * lives here rather than in either of them, where it would close a cycle.
 */

import fs from 'fs';

/**
 * Owner-only. A meditation journal and an emotion log are the private half of
 * a diary, so the files this app creates start unreadable to other accounts on
 * the machine. The vault directory itself is left alone: the user chose that
 * folder and may well have chosen a shared or synced one.
 */
const FILE_MODE = 0o600;

/** The parsed contents, or `fallback` when the file is missing or unparseable. */
export function readJsonFile<T>(filePath: string, fallback: T): T {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    } catch {
        /* absent, unreadable, or half-written — all three mean "nothing usable here" */
        return fallback;
    }
}

/**
 * Write via a tmp file and rename, so a crash mid-write cannot leave a
 * truncated collection behind. `mode` on `writeFileSync` only applies when the
 * file is created, and a `.tmp` orphaned by an earlier crash is not created —
 * hence the explicit chmod, without which one interrupted write leaves a 0644
 * file that every later write renames back into place.
 */
export function writeJsonFile(filePath: string, value: unknown): void {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: FILE_MODE });
    fs.chmodSync(tmp, FILE_MODE);
    fs.renameSync(tmp, filePath);
}
