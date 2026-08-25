# Security Policy

## Security Architecture

Zen Garden is a **local-first, cross-platform application** with a fully offline architecture:

- ✅ **No server-side code** - No backend vulnerabilities or network attack surface
- ✅ **No network requests** - No data transmission, no telemetry, no tracking
- ✅ **Local-only storage** - JSON files on the user's device with atomic writes (write to `.tmp`, then `rename`)
- ✅ **Electron hardening** - `contextIsolation: true`, `nodeIntegration: false`, narrow typed preload bridge
- ✅ **Password hashing** - Argon2 (desktop, preferred) with PBKDF2 fallback; PBKDF2 via Web Crypto (mobile)
- ✅ **Recovery codes** - Stored as PBKDF2 hashes, never in plaintext
- ✅ **Input validation** - Username and password validated at the IPC boundary
- ✅ **Session management** - Session cleared on app startup; cached storage cleared on window creation
- ✅ **Open source** - Fully auditable code

## Data Privacy

All user data is stored locally:

- **macOS:** `~/Library/Application Support/zen-garden/data/`
- **Windows:** `%APPDATA%/zen-garden/data/`
- **Linux:** `~/.config/zen-garden/data/`
- **Android:** File Manager → Documents → ZenGarden → `data/`

Your meditation data, emotions, and journal entries never leave your device.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it through [GitHub's private vulnerability reporting](https://github.com/larrydarko1/ZenGarden/security/advisories/new) or email the maintainer directly for sensitive issues.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

## Supported Versions

Security issues will be addressed in the latest major release. Older versions may not receive updates.

## Security Best Practices for Users

- Keep the app updated to the latest version
- Use a strong password (minimum 8 characters)
- Generate and securely store your recovery codes
- Regularly backup your data folder
- Only download from official releases
