# Changelog

All notable changes to ZenGarden are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Formatting and lint rules now come from the shared `@larrydarko/lint-config` package.

### Security

- Updated dependencies.

## [2.1.2] - 2026-09-17

### Fixed

- Eightfold Path notes now persist.

## [2.1.0] - 2026-09-14

### Removed

- Breathing exercises.

## [2.0.0] - 2026-08-30

### Changed

- Data now lives in a vault: a folder you choose, holding plain JSON files. You pick it on first launch and can change it in Settings. On Android the vault is fixed to `Documents/ZenGarden/`.
- Stylesheet comments no longer ship in the build, making it about 60% lighter.

### Removed

- Accounts, login and password recovery. The vault replaces them.
- macOS binaries. Releases now carry Linux packages only. macOS and Android can still be built from source.

### Fixed

- The modal after a meditation session.

### Security

- Analytics tallies are keyed by a `Map` instead of an object literal.

## 1.3.0 - 2026-08-26

Never published as a release; its changes shipped in 2.0.0.

### Changed

- Restyled the app on a shared design system. The philosophy page dropped its icons and closing quote.

### Removed

- Windows builds.
- Intel Mac builds. macOS builds are Apple Silicon only.

## [1.2.0] - 2026-06-05

### Changed

- New icon.
- The app uses the default title bar.

### Removed

- The Android APK from releases.

### Security

- Updated dependencies.

## [1.1.9] - 2026-03-18

### Changed

- The app orientation is locked on mobile.
- Rewrote the desktop app on electron-vite with a unified storage layer, as part of a large internal refactor.

### Fixed

- A duplicate checkmark in every language, which is already shown as an icon.
- Meditation audio, lost in the refactor.

### Security

- Updated dependencies.

## 1.1.0 – 1.1.8 - 2026-02-04 to 2026-02-24

Before 1.1.9, the version was bumped on almost every commit, so earlier versions are grouped by minor version.

### Added

- A desktop header, so the nav menu no longer overlaps the window buttons on Windows and Linux (1.1.0).
- Daily notes in the Emotion Tracker (1.1.1) and more Emotion Tracker stats (1.1.2).
- A separate Android icon (1.1.5).
- Releases built by CI (1.1.7 – 1.1.8).

### Changed

- A large UI redesign (1.1.4), with further UI improvements (1.1.5).

### Removed

- The gratitude journal, replaced by daily notes (1.1.1).
- iOS support (1.1.4).

### Fixed

- Meditations with blank notes were not saved (1.1.3).

## 1.0.0 – 1.0.9 - 2026-01-22 to 2026-01-29

### Added

- Initial release (1.0.0).
- Proper app icon (1.0.1).
- Compatibility with the database of the other ZenGarden project (1.0.3).
- Experimental mobile versions using Capacitor (1.0.6).
- New animations (1.0.7).

### Changed

- New icons (1.0.8).

### Removed

- Data export, which added little for a local app (1.0.4).

### Fixed

- Bug fixes (1.0.1, 1.0.2, 1.0.4) and UI fixes (1.0.5, 1.0.6).

### Security

- Security fix (1.0.9).

[Unreleased]: https://github.com/larrydarko1/zengarden/compare/v2.1.2...HEAD
[2.1.2]: https://github.com/larrydarko1/zengarden/compare/v2.1.0...v2.1.2
[2.1.0]: https://github.com/larrydarko1/zengarden/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/larrydarko1/zengarden/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/larrydarko1/zengarden/compare/v1.1.9...v1.2.0
[1.1.9]: https://github.com/larrydarko1/zengarden/compare/v1.1.8...v1.1.9
