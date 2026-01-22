# Security Policy

## Security Architecture

Zen Garden is a **desktop-only application** with local-first architecture, which provides enhanced security:

- ✅ **No server-side code** - No backend vulnerabilities
- ✅ **Local-only storage** - Data stored in JSON files on user's computer
- ✅ **No network requests** - No data transmission risks
- ✅ **Client-side encryption** - Password hashing with PBKDF2
- ✅ **No telemetry** - No tracking or analytics
- ✅ **Open source** - Fully auditable code

## Data Privacy

All user data is stored locally at:
- **macOS:** `~/Library/Application Support/zen-garden/`
- **Windows:** `%APPDATA%/zen-garden/`
- **Linux:** `~/.config/zen-garden/`

Your meditation data, emotions, and journal entries never leave your device.

## Reporting a Vulnerability

If you discover a security vulnerability in the Electron app or client-side code, please report it by:

1. Opening a GitHub issue with the label `security`
2. Or emailing the maintainer directly (for sensitive issues)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

## Supported Versions

Security issues will be addressed in the latest major release. Older versions may not receive updates.

## Security Best Practices for Users

- Keep the app updated to the latest version
- Use a strong password for your account
- Regularly backup your data folder
- Only download from official releases
