# Contributing to Zen Garden

Thank you for considering contributing to Zen Garden! This is a desktop application built with Electron and Vue 3.

## Development Setup

1. **Fork the repository**
2. **Clone your fork**
   ```sh
   git clone https://github.com/larrydarko1/ZenGarden.git
   cd zen-garden
   ```
3. **Install dependencies**
   ```sh
   npm install
   ```
4. **Start the development environment**
   ```sh
   npm run dev:electron
   ```

This will launch the Electron app with hot reload enabled.

## Project Structure

- `electron/` - Electron main process and storage backend (Node.js)
- `src/` - Vue 3 frontend (renderer process)
- `src/storage/` - Storage adapters and types
- `src/components/` - Vue components
- `src/locales/` - Internationalization files

## How to Contribute

### Bug Fixes & Features
- Create a new branch for your feature or bugfix
  ```sh
  git checkout -b feature/your-feature-name
  ```
- Make your changes with clear commit messages
- Test your changes in the Electron app
- Open a pull request describing your changes

### Testing
- Test the desktop app on your platform
- Verify data persistence in JSON files
- Check that features work offline
- Test across different themes and languages

## Code Style
- Use consistent formatting (TypeScript/JavaScript)
- Write clear, descriptive comments where necessary
- Follow existing patterns in the codebase
- Keep components small and focused

## Reporting Issues
- Use GitHub Issues for bugs and feature requests
- Provide steps to reproduce bugs if possible
- Include your OS version and Electron app version
- Screenshots are helpful!

## Code of Conduct
Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?
Feel free to open a discussion or issue if you need help!
