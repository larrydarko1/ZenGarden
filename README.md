# ZenGarden 

![License](https://img.shields.io/github/license/larrydarko1/ZenGarden)
![Issues](https://img.shields.io/github/issues/larrydarko1/ZenGarden)
![Pull Requests](https://img.shields.io/github/issues-pr/larrydarko1/ZenGarden)
![Contributors](https://img.shields.io/github/contributors/larrydarko1/ZenGarden)

Zen Garden is a **local-first, cross-platform meditation app** built with **Electron** (desktop), **Capacitor** (mobile), **Vue 3**, and TypeScript. All your data stays on your device in MongoDB-compatible JSON files - no server, no cloud, completely private. Features guided meditations, a meditation calendar, and relaxing animations.

> **IMPORTANT:** This app runs natively on **Desktop** (macOS, Windows, Linux) and **Mobile** (Android). All data is stored in JSON files on your device and never leaves it.

## Demo

![Zen Garden Demo](./public/demo.gif)

## Tech Stack
- **Desktop:** Electron (Native macOS, Windows, Linux app)
- **Mobile:** Capacitor (Native Android app)
- **Frontend:** Vue 3, TypeScript, Vite, SCSS
- **Storage:** JSON files (MongoDB-compatible document structure)
- **Build Tools:** Vite + Electron Builder + Capacitor CLI

## Features

### Meditation & Mindfulness
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
- **Animated Zen backgrounds** - Wind, Waves, and other animations
- **Three themes** - Blue, White, and Dark modes
- **Fully responsive** - optimized for different screen sizes
- **8 languages** - English, Spanish, Italian, French, German, Portuguese, Chinese, Japanese

### Technical Features
- **Cross-Platform** - Native apps for macOS, Windows, Linux, and Android
- **100% Offline** - works completely without internet connection
- **User-Accessible Storage** - JSON files you can view, backup, and control
- **Privacy-first** - no server, no tracking, no data collection, no telemetry
- **Secure** - password hashing with PBKDF2 cryptography
- **MongoDB-compatible** - data structure matches MEVN stack for easy migration

> **Privacy Note:** This app runs entirely on your device. Your meditation data, emotions, and notes are stored in JSON files on your local file system and never leave your device.

## Data Storage Location

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
- Node.js (v18+ recommended)
- npm

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
npm run dev:electron
```

This will:
- Start Vite dev server on http://localhost:3000
- Launch the Electron desktop app
- Enable hot reload for development

#### Mobile Development

See [MOBILE.md](MOBILE.md) for complete mobile development guide.

**Quick Start:**
```sh
# Build and sync to mobile platforms
npm run build:mobile

# Open in native IDEs
npm run cap:open:android  # Requires Android Studio

# Run on device/emulator
npm run cap:run:android
```

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

## What Changed from Previous Versions?

This version is a **complete cross-platform rewrite**:

### Now Includes:
- ✅ Native desktop apps (Electron) - macOS, Windows, Linux
- ✅ Native mobile apps (Capacitor) - Android
- ✅ JSON file storage (MongoDB-compatible)
- ✅ User-accessible data files (view, backup, control)
- ✅ Data survives app uninstall (mobile)
- ✅ Cross-platform installers
- ✅ Native OS integration
- ✅ No browser dependencies
- ✅ Complete privacy - data in local files

## Architecture

### Desktop (Electron)
```
Desktop App
├── Electron (Native shell)
│   ├── Main Process (Node.js)
│   │   └── storage.cjs (JSON file operations)
│   └── Renderer Process (Chromium)
│       └── Vue 3 App (Your UI)
└── Data Storage
    └── JSON Files (~/Library/Application Support/zen-garden/data/)
```

### Mobile (Capacitor)
```
Mobile App
├── Capacitor (Native shell)
│   ├── Native Android Runtime
│   ├── WebView (renders Vue app)
│   └── Native Plugins
│       ├── Filesystem API (JSON operations)
│       └── Preferences API (session storage)
└── Data Storage
    └── Android: Documents/ZenGarden/data/
```

### Storage Adapter Pattern
The app automatically detects the platform and uses the appropriate storage adapter:
- **Electron**: Direct file system access (Node.js)
- **Capacitor**: Filesystem API (native mobile storage)
- **Same JSON structure**: Both use MongoDB-compatible documents

## Data Format

All data is stored in MongoDB-compatible JSON format. Example meditation document:

```json
{
  "_id": "lqr8g4k3j2h",
  "Username": "john",
  "Date": "2026-01-22",
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
