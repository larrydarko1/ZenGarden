# Zen Garden - Desktop Edition

![License](https://img.shields.io/github/license/larrydarko1/zen-garden)
![Issues](https://img.shields.io/github/issues/larrydarko1/zen-garden)
![Pull Requests](https://img.shields.io/github/issues-pr/larrydarko1/zen-garden)
![Contributors](https://img.shields.io/github/contributors/larrydarko1/zen-garden)

Zen Garden is a **local-first, desktop meditation app** built with **Electron**, **Vue 3**, and TypeScript. All your data stays permanently on your computer in JSON files - no server, no cloud, completely private. Features guided meditations, a meditation calendar, and relaxing animations.

> **IMPORTANT:** This is the **DESKTOP EDITION** - it runs as a native desktop application with permanent local storage. All data is stored in JSON files on your computer.

## Demo

![Zen Garden Demo](./public/demo.gif)

## Tech Stack
- **Desktop:** Electron (Native macOS, Windows, Linux app)
- **Frontend:** Vue 3, TypeScript, Vite, SCSS
- **Storage:** JSON files (MongoDB-compatible document structure)
- **Build Tool:** Vite + Electron Builder

## Features

### Meditation & Mindfulness
- **Meditation calendar** - visual tracking of your meditation history
- **Session notes** - reflect and journal after each session

### Breathing & Wellness
- **Breathing exercises** - Box, 4-7-8, Deep, and Energizing techniques
- **Emotion tracker** - log and monitor your daily emotional state
- **Gratitude journal** - cultivate gratitude with daily entries

### Insights & Progress
- **Correlation insights** - discover the impact of meditation on your emotions
- **Eightfold Path tracker** - follow Buddhist principles for mindful living
- **Statistics dashboard** - meditation days, average time, and emotional trends
- **Duration impact analysis** - see how meditation length affects your wellbeing

### Design & Experience
- **Animated Zen backgrounds** - Wind, Waves, and Idle animations
- **Three themes** - Blue, White, and Dark modes
- **Fully responsive** - optimized for different screen sizes
- **8 languages** - English, Spanish, Italian, French, German, Portuguese, Chinese, Japanese

### Technical Features
- **Native Desktop App** - runs like any other application on your computer
- **100% Offline** - works completely without internet connection
- **Permanent Storage** - JSON files on your hard drive (won't be cleared)
- **Privacy-first** - no server, no tracking, no data collection, no telemetry
- **Secure** - password hashing with PBKDF2 cryptography
- **MongoDB-compatible** - data structure matches MEVN stack for easy migration

> **Privacy Note:** This app runs entirely on your computer. Your meditation data, emotions, and journal entries are stored in JSON files on your local file system and never leave your device.

## Data Storage Location

Your data is stored in JSON files at:
- **macOS:** `~/Library/Application Support/zen-garden-light/data/`
- **Windows:** `%APPDATA%/zen-garden-light/data/`
- **Linux:** `~/.config/zen-garden-light/data/`
- `meditations.json` - Meditation sessions
- `emotion_logs.json` - Emotion tracking data
- `gratitude_entries.json` - Gratitude journal entries
- `eightfold_path_logs.json` - Buddhist path progress
- `session.json` - Current session data

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Setup

1. **Clone the repository**
```sh
git clone https://github.com/larrydarko1/zen-garden.git
cd zen-garden
```

2. **Install dependencies**
```sh
npm install
```

3. **No additional configuration needed!** This desktop app has no backend server or cloud database. Everything runs locally.

### Development

```sh
# Start the Electron app in development mode
npm run dev:electron
```

This will:
- Start Vite dev server on http://localhost:3000
- Launch the Electron desktop app
- Enable hot reload for development

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

This **Desktop Edition** transformed from a browser-based PWA to a native desktop application:

### Now Includes:
- ✅ Native Electron desktop app
- ✅ JSON file storage (MongoDB-compatible)
- ✅ Permanent local storage (never cleared)
- ✅ Cross-platform installers
- ✅ Native OS integration
- ✅ No browser dependencies
- ✅ Complete privacy - data in local files

## Architecture

```
Desktop App
├── Electron (Native shell)
│   ├── Main Process (Node.js)
│   │   └── storage.cjs (JSON file operations)
│   └── Renderer Process (Chromium)
│       └── Vue 3 App (Your UI)
└── Data Storage
    └── JSON Files (~/Library/Application Support/zen-garden/)
```

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
Simply copy the entire data folder:
- **macOS:** `~/Library/Application Support/zen-garden/`
- **Windows:** `%APPDATA%/zen-garden/`
- **Linux:** `~/.config/zen-garden/`

### Restoring Data
1. Quit the app
2. Replace the data folder with your backup
3. Restart the app

### Migrating to MongoDB (Future)
Since data is already in MongoDB format:
1. Read the JSON files
2. Import directly into MongoDB collections
3. No data transformation needed!

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
