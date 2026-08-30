# Security Policy

## Security Architecture

ZenGarden is a **local-first, cross-platform application** with a fully offline architecture:

- ✅ **No server-side code** - No backend vulnerabilities or network attack surface
- ✅ **No network requests** - No data transmission, no telemetry, no tracking
- ✅ **Local-only storage** - JSON files in a folder the user chose, with atomic writes (write to `.tmp`, then `rename`)
- ✅ **Electron hardening** - `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, narrow typed preload bridge
- ✅ **Content Security Policy** - `default-src 'self'` with no `unsafe-eval`; `object-src`, `frame-src`, `base-uri` and `form-action` all denied
- ✅ **Navigation containment** - External links open in the system browser; in-app navigation off the app origin is blocked
- ✅ **Deny-all permissions** - Every web permission request is refused at the session level
- ✅ **No credentials** - There is no account, password, session or recovery code, so there is no secret to steal, forge or replay
- ✅ **Owner-only files** - Files the app creates are written `0600`; the vault folder keeps the permissions the user gave it
- ✅ **No renderer-supplied paths** - The vault changes only through the OS folder dialog; no IPC channel accepts a path from the renderer
- ✅ **Input validation** - Every IPC argument is parsed against a Zod schema in the main process before use
- ✅ **Session-free** - Nothing is cached between runs but the vault's location; web storage is cleared on window creation and at quit
- ✅ **Open source** - Fully auditable code

## Data Privacy

All user data is stored locally, in a vault folder:

- **Desktop:** wherever the user pointed the app; only its location is remembered, in `state.json` under the app's config directory
- **Android:** `Documents/ZenGarden/` — a fixed, user-visible folder, because the files hold nothing but the journal

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
renderer code execution, IPC handlers that read or write outside the open vault, and any way for renderer-supplied input to reach the filesystem as a path. The same surface on Android, via the Capacitor adapter, counts too.

Out of scope: findings that require an attacker to already have the user's filesystem or OS account.
The vault holds plain JSON files under the user's own permissions by design, so "another local process can read the journal" is the threat model working as intended, not a vulnerability. ZenGarden has no accounts and never had a security boundary between users of the same machine — that boundary is the operating system's.

Dependency advisories with no reachable path in Zen Garden's code are tracked in the audit gate's
allowlist ([scripts/check/check-audit.mjs](../scripts/check/check-audit.mjs)) rather than reported
as vulnerabilities. Each entry carries the reason it cannot be fixed here, and CI fails once the
advisory stops being reported — upstream shipped a fix, so the waiver has to go.

## Supported Versions

Security issues are fixed in the latest release only. There are no backports — upgrade is the
remediation path.

## Security Best Practices for Users

- Keep the app updated to the latest version
- Put the vault somewhere only your OS account can read
- Regularly back up the vault folder
- Only download from official releases
- Use OS-level disk encryption if your journal entries are sensitive
