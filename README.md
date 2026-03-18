# ZenGarden

![License](https://img.shields.io/github/license/larrydarko1/ZenGarden)
![Issues](https://img.shields.io/github/issues/larrydarko1/ZenGarden)
![Pull Requests](https://img.shields.io/github/issues-pr/larrydarko1/ZenGarden)
![Contributors](https://img.shields.io/github/contributors/larrydarko1/ZenGarden)

Zen Garden is a **local-first, cross-platform meditation app** built with **Electron** (desktop), **Capacitor** (mobile), **Vue 3**, and TypeScript. All your data stays on your device in MongoDB-compatible JSON files - no server, no cloud, completely private. Features a meditation timer with bell sounds, breathing exercises, a meditation calendar, and relaxing Zen animations.

> **IMPORTANT:** This app runs natively on **Desktop** (macOS, Windows, Linux) and **Mobile** (Android). All data is stored in JSON files on your device and never leaves it.

## Demo

![Zen Garden Demo](./public/demo.gif)

## Features

### Meditation & Mindfulness

- **Meditation timer** - configurable duration with bell interval markers
- **Bell sounds only** - no artificial ambient sounds or music; in Zen tradition, the world is your soundtrack
- **Meditation calendar** - visual tracking of your meditation history
- **Session notes** - reflect and journal after each session

### Breathing & Wellness

- **Breathing exercises** - Box, 4-7-8, Deep, and Energizing techniques
- **Emotion tracker** - log and monitor your daily emotional state with daily notes

### Insights & Progress

- **Correlation insights** - discover the impact of meditation on your emotions
- **Eightfold Path tracker** - follow Buddhist principles for mindful living
- **Statistics dashboard** - meditation days, average time, and emotional trends
- **Duration impact analysis** - see how meditation length affects your wellbeing

### Design & Experience

- **Zen philosophy built-in** - explains the design choices behind the app
- **Animated Zen backgrounds** - Wind, Waves, and other animations
- **Fully responsive** - optimized for different screen sizes
- **8 languages** - English, Spanish, Italian, French, German, Portuguese, Chinese, Japanese

### Technical Features

- **Cross-Platform** - Native apps for macOS, Windows, Linux, and Android
- **100% Offline** - works completely without internet connection
- **User-Accessible Storage** - JSON files you can view, backup, and control
- **Privacy-first** - no server, no tracking, no data collection, no telemetry
- **Secure** - Argon2 (desktop) / PBKDF2 (mobile) password hashing, recovery codes, atomic file writes
- **MongoDB-compatible** - data structure matches MEVN stack for easy migration

> **Privacy Note:** This app runs entirely on your device. Your meditation data, emotions, and notes are stored in JSON files on your local file system and never leave your device.

## Security & Privacy

Zen Garden is built with privacy and security as core principles:

### Privacy Guarantees

- ✅ **No telemetry** - We don't collect any usage data, analytics, or crash reports
- ✅ **No network requests** - The app works 100% offline and makes zero external connections
- ✅ **No cloud sync** - Your data never leaves your device unless you explicitly copy it
- ✅ **No accounts required** - Authentication is local-only; no sign-ups or external auth providers

### Security Architecture

- ✅ **Electron hardening** - Context isolation and disabled Node.js integration in the renderer
- ✅ **Typed preload bridge** - Narrow IPC API; no raw Node or Electron APIs leak to the frontend
- ✅ **Password hashing** - Argon2 (desktop) with PBKDF2 fallback; PBKDF2 via Web Crypto (mobile)
- ✅ **Recovery codes** - Stored as PBKDF2 hashes, never in plaintext
- ✅ **Atomic writes** - Data written to `.tmp` then renamed, preventing corruption on crash
- ✅ **Input validation** - Username and password validated at the IPC boundary before any processing
- ✅ **Open source** - Full transparency — audit the code yourself

### Reporting Security Issues

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for reporting instructions.

## Data Storage

Your data is stored in MongoDB-compatible JSON files:

### Desktop

- **macOS:** `~/Library/Application Support/zen-garden/data/`
- **Windows:** `%APPDATA%/zen-garden/data/`
- **Linux:** `~/.config/zen-garden/data/`

### Mobile

- **Android:** File Manager → Documents → ZenGarden → `data/`

### Files

- `users.json` - User accounts (hashed passwords)
- `meditations.json` - Meditation sessions
- `emotion_logs.json` - Emotion tracking data
- `eightfold_path_logs.json` - Buddhist path progress
- `session.json` - Current session data

> **Note:** On mobile, files are accessible through your device's file manager. You can view, copy, backup, or delete them anytime. Data survives app uninstall.

## Getting Started

### Prerequisites

- Node.js (v22+ recommended)
- npm
- **For Android development:** [Android Studio](https://developer.android.com/studio) installed (provides the JDK and Android SDK)

### Setup

1. **Clone the repository**

```sh
git clone https://github.com/larrydarko1/ZenGarden.git
cd ZenGarden
```

2. **Install dependencies**

```sh
npm install
```

3. **No additional configuration needed!** This desktop app has no backend server or cloud database. Everything runs locally.

### Development

#### Desktop Development

```sh
# Start the Electron app in development mode
npm run dev
```

This will:

- Start Vite dev server on http://localhost:3000
- Launch the Electron desktop app
- Enable hot reload for development

#### Mobile Development

Requires **Android Studio** to be installed at the default location. The npm scripts automatically set `JAVA_HOME` and `ANDROID_HOME` to use Android Studio's bundled JDK and SDK, so no manual environment variable configuration is needed.

| Variable       | Path (set automatically by the scripts)                       |
| -------------- | ------------------------------------------------------------- |
| `JAVA_HOME`    | `/Applications/Android Studio.app/Contents/jbr/Contents/Home` |
| `ANDROID_HOME` | `~/Library/Android/sdk`                                       |

> **Note:** If Android Studio is installed in a non-default location, or you're on Linux/Windows, update the paths in the `cap:run:android` script in [package.json](package.json).

**Quick Start:**

```sh
# Build and sync to mobile platforms
npm run build:mobile

# Open in native IDEs
npm run cap:open:android  # Requires Android Studio

# Build, sync, and run on device/emulator (JAVA_HOME & ANDROID_HOME are set inline)
npm run cap:run:android
```

### Testing & Code Quality

```sh
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint source code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format source code
npm run format
```

Tests live in the `tests/` directory and mirror the `src/` structure. The CI pipeline runs lint, format check, type-check, build, and all tests on every push and pull request.

### Building Desktop Apps

```sh
# Build for your current platform
npm run build:electron

# Build specifically for macOS
npm run build:mac

# Build for Windows (requires Windows or cross-compilation setup)
npm run build:win

# Build for Linux
npm run build:linux
```

The built installers will be in the `dist-electron/` directory:

- **macOS:** `.dmg` installer
- **Windows:** `.exe` installer
- **Linux:** `.AppImage` file

### Installing the App

After building:

1. Navigate to `dist-electron/`
2. Double-click the installer for your platform
3. Follow installation prompts
4. Launch "ZenGarden" from your Applications folder

## Distribution

To share the app with others:

1. Build for the target platform(s)
2. Share the installer file from `dist-electron/`
3. Users install like any native app
4. No server setup required - each installation is completely independent

## Tech Stack

- **Desktop:** Electron 40, electron-vite 5 (Native macOS, Windows, Linux app)
- **Mobile:** Capacitor 8 (Native Android app)
- **Frontend:** Vue 3, TypeScript (strict), Vite, SCSS, vue-i18n
- **Storage:** JSON files with atomic writes (MongoDB-compatible document structure)
- **Security:** Argon2 / PBKDF2 password hashing, recovery codes, context-isolated preload bridge
- **Testing:** [Vitest](https://vitest.dev) + jsdom (298 tests across 14 test files)
- **Code Quality:** [ESLint](https://eslint.org) flat config, [Prettier](https://prettier.io), husky + lint-staged + commitlint
- **Build Tools:** [electron-vite](https://electron-vite.org) + Electron Builder + Capacitor CLI
- **CI:** GitHub Actions (lint → format → type-check → build → test)

## Project Structure

```
src/
├── main/                        → Electron main process (Node.js)
│   ├── index.ts                 → BrowserWindow setup, IPC registration, app lifecycle
│   └── services/
│       ├── storage.ts           → IPC handler registration entry point
│       ├── auth.ts              → Auth handlers (register, login, recovery codes)
│       ├── data.ts              → Data handlers (meditations, emotions, eightfold path)
│       ├── db.ts                → JSON file persistence, atomic writes, normalisation
│       └── crypto.ts            → Argon2/PBKDF2 hashing, token generation
├── preload/
│   └── index.ts                 → contextBridge — narrow typed API exposed to renderer
└── renderer/                    → Vue 3 SPA
    ├── components/              → Decomposed UI components
    │   ├── Home.vue             → Main dashboard orchestrator
    │   ├── home/                → MeditationOverlay, BottomNav
    │   ├── emotions/            → EmotionAnalytics, EightfoldPathView, DailyNotes
    │   └── animations/          → Zen background SVG animations
    ├── composables/             → Reactive state + side-effect management
    │   ├── useMeditationSession.ts
    │   ├── useEmotions.ts
    │   └── useEightfoldPath.ts
    ├── store/                   → Storage adapter layer
    │   ├── types.ts             → All shared TypeScript interfaces
    │   ├── index.ts             → Thin wrappers delegating to active adapter
    │   └── adapters/
    │       ├── factory.ts       → Auto-detects Electron or Capacitor, caches adapter
    │       ├── electron.ts      → IPC bridge to main process
    │       └── capacitor.ts     → Capacitor Filesystem + Web Crypto
    │           └── capacitor/
    │               ├── db.ts    → Mobile JSON file I/O
    │               └── crypto.ts → PBKDF2 via Web Crypto API
    ├── utils/platform.ts        → Runtime platform detection
    └── locales/                 → 8 language bundles (en, es, it, fr, de, pt, zh, ja)
tests/                           → Mirrors src/ — 14 test files, 298 tests
```

## Architecture

### Desktop (Electron)

```
Desktop App
├── Electron (Native shell)
│   ├── Main Process (Node.js)
│   │   ├── services/auth.ts       → Authentication + recovery codes
│   │   ├── services/data.ts       → Meditation, emotion, eightfold path CRUD
│   │   ├── services/db.ts         → JSON persistence with atomic writes
│   │   └── services/crypto.ts     → Argon2 / PBKDF2 hashing
│   ├── Preload (contextBridge)
│   │   └── Typed IPC API — no Node.js exposure to renderer
│   └── Renderer Process (Chromium)
│       └── Vue 3 App → store/adapters/electron.ts → IPC calls
└── Data Storage
    └── JSON Files (~/Library/Application Support/zen-garden/data/)
```

### Mobile (Capacitor)

```
Mobile App
├── Capacitor (Native shell)
│   ├── Native Android Runtime
│   ├── WebView (renders Vue app)
│   │   └── Vue 3 App → store/adapters/capacitor.ts → Filesystem API
│   └── Native Plugins
│       ├── Filesystem API (JSON file operations)
│       └── Preferences API (session storage)
└── Data Storage
    └── Android: Documents/ZenGarden/data/
```

### Storage Adapter Pattern

The app uses an `IStorageAdapter` interface implemented by two adapters. A `StorageFactory` auto-detects the platform at runtime and caches the result:

- **ElectronStorageAdapter** — bridges Vue to Node.js JSON backend via IPC
- **CapacitorStorageAdapter** — uses Capacitor Filesystem + Web Crypto API
- **Same interface, same JSON structure** — both use MongoDB-compatible documents

## Data Format

All data is stored in MongoDB-compatible JSON format. Example meditation document:

```json
{
    "_id": "lqr8g4k3j2h",
    "username": "john",
    "date": "2026-01-22",
    "duration": 20,
    "notes": "Great session focusing on breath",
    "createdAt": "2026-01-22T20:35:00.000Z"
}
```

This makes it easy to:

- Read your data in any text editor
- Migrate to MongoDB if needed
- Backup by copying JSON files
- Process data with scripts

## Backup & Migration

### Backing Up Your Data

**Desktop:** Simply copy the entire data folder:

- **macOS:** `~/Library/Application Support/zen-garden/data/`
- **Windows:** `%APPDATA%/zen-garden/data/`
- **Linux:** `~/.config/zen-garden/data/`

**Mobile:** Access files through your device:

- **Android:** File Manager → Documents → ZenGarden → Copy to Drive/SD card

### Restoring Data

1. Quit the app (or uninstall on mobile)
2. Replace the data folder with your backup
3. Restart the app (or reinstall on mobile)

### Migrating to MongoDB (Future)

Since data is already in MongoDB format:

1. Read the JSON files
2. Import directly into MongoDB collections
3. No data transformation needed!

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Made with Vue 3, Electron, Capacitor, and a passion for mindful, local-first software.**
