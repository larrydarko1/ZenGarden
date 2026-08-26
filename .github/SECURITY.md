# Security Policy

## Security Architecture

ZenGarden is a **local-first, cross-platform application** with a fully offline architecture:

- ✅ **No server-side code** - No backend vulnerabilities or network attack surface
- ✅ **No network requests** - No data transmission, no telemetry, no tracking
- ✅ **Local-only storage** - JSON files on the user's device with atomic writes (write to `.tmp`, then `rename`)
- ✅ **Electron hardening** - `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, narrow typed preload bridge
- ✅ **Content Security Policy** - `default-src 'self'` with no `unsafe-eval`; `object-src`, `frame-src`, `base-uri` and `form-action` all denied
- ✅ **Navigation containment** - External links open in the system browser; in-app navigation off the app origin is blocked
- ✅ **Deny-all permissions** - Every web permission request is refused at the session level
- ✅ **Password hashing** - PBKDF2-SHA256 at 600,000 iterations (OWASP's current figure), derived with Node's `crypto` on desktop and Web Crypto on Android
- ✅ **One record format** - Desktop and Android write the same hashed-password record, so a copied data folder does not silently lock an account out
- ✅ **Migration on login** - Records written by older versions are re-hashed to the current format and cost on the next successful login
- ✅ **Recovery codes** - Crockford base32, stored as PBKDF2 hashes, never in plaintext; compared in constant time
- ✅ **Input validation** - Every IPC argument is parsed against a Zod schema in the main process before use
- ✅ **Session management** - Session cleared on app startup; cached storage cleared on window creation
- ✅ **Open source** - Fully auditable code

## Data Privacy

All user data is stored locally:

- **macOS:** `~/Library/Application Support/zen-garden/data/`
- **Linux:** `~/.config/zen-garden/data/`
- **Android:** File Manager → Documents → ZenGarden → `data/`

Your meditation data, emotions, and journal entries never leave your device.

## Reporting a Vulnerability

**Do not open a public issue.** ZenGarden has no auto-update — installed copies stay on whatever
version the user downloaded until they choose to replace it. A public report is therefore a working
disclosure against every existing install, and unlike a web app there is no way to push the fix out.

Email the maintainer at <hello@larrydarko.dev> instead. Private reporting on GitHub is not enabled,
so email is the only private channel — reports sent any other way risk being public.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

Expect an acknowledgement within a week. ZenGarden is maintained by one person, so a fix timeline depends on severity; you will be told which release carries the fix, and credited in it unless you ask not to be.

## Scope

In scope: anything reachable in the Electron app or its IPC surface — preload bridge escapes,
renderer code execution, IPC handlers that act without a validated session, authentication bypass,
recovery-code forgery or replay, and anything that reads or writes another local account's data.
The same surface on Android, via the Capacitor adapter, counts too.

Out of scope: findings that require an attacker to already have the user's filesystem or OS account.
The data folder holds plain JSON files under the user's own permissions by design, so "another local
process can read `users.json`" is the threat model working as intended, not a vulnerability. Local accounts separate one person's meditation history from another's on a shared device; they are not a security boundary against someone who already controls the machine.

Dependency advisories with no reachable path in Zen Garden's code are tracked in the audit gate's
allowlist ([scripts/check/check-audit.mjs](../scripts/check/check-audit.mjs)) rather than reported
as vulnerabilities. Each entry carries the reason it cannot be fixed here, and CI fails once the
advisory stops being reported — upstream shipped a fix, so the waiver has to go.

## Supported Versions

Security issues are fixed in the latest release only. There are no backports — upgrade is the
remediation path.

## Security Best Practices for Users

- Keep the app updated to the latest version
- Use a strong password (minimum 8 characters)
- Generate and securely store your recovery codes
- Regularly backup your data folder
- Only download from official releases
- Use OS-level disk encryption if your journal entries are sensitive
