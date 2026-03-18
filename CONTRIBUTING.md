# Contributing to Zen Garden

Thank you for considering contributing to Zen Garden! This is a cross-platform meditation app built with Electron (desktop), Capacitor (mobile), Vue 3, and TypeScript.

## Development Setup

1. **Fork the repository**
2. **Clone your fork**
    ```sh
    git clone https://github.com/larrydarko1/ZenGarden.git
    cd ZenGarden
    ```
3. **Install dependencies**
    ```sh
    npm install
    ```
4. **Start the development environment**
    ```sh
    npm run dev
    ```

This will launch the Electron app with Vite hot reload on http://localhost:3000.

## Project Structure

See the [README](README.md#project-structure) for the full project structure tree.

Key conventions:

- **Main process** (`src/main/`) — Electron backend. Business logic lives in `services/`, JSON persistence in `db.ts`
- **Preload** (`src/preload/`) — Secure IPC bridge. All renderer↔main communication goes through here
- **Renderer** (`src/renderer/`) — Vue 3 frontend. Components in `components/` (decomposed into sub-folders), reusable logic in `composables/`, storage layer in `store/` (adapter pattern: `factory.ts` → `electron.ts` / `capacitor.ts`)
- **Tests** (`tests/`) — Mirrors the `src/` structure (`tests/main/`, `tests/renderer/`)

## How to Contribute

### Bug Fixes & Features

- Create a new branch for your feature or bugfix
    ```sh
    git checkout -b feature/your-feature-name
    ```
- Make your changes following the conventions below
- Open a pull request describing your changes

### Before Submitting a PR

Run these commands and make sure they all pass — CI will run the same checks:

```sh
# Type-check (must pass with zero errors)
npx vue-tsc --noEmit

# Unit tests
npm test

# Lint
npm run lint

# Formatting
npm run format:check
```

If lint or formatting fails, auto-fix with:

```sh
npm run lint:fix
npm run format
```

### Commit Conventions

This project uses **Conventional Commits** enforced by commitlint. Husky runs lint-staged and commitlint on every commit automatically.

```
feat(scope): add new feature
fix(scope): fix a bug
refactor(scope): restructure without changing behavior
test(scope): add or update tests
docs: update documentation
chore: maintenance tasks
```

### Writing Tests

Tests use [Vitest](https://vitest.dev) and live in `tests/`, mirroring the `src/` folder structure:

- Place test files next to what they test: `src/main/services/auth.ts` → `tests/main/services/auth.test.ts`
- Use `.test.ts` file extension
- Run `npm run test:watch` during development for instant re-runs on save
- Priority: security functions → pure utilities → services → adapters → composables
- Always test negative cases and boundary conditions

## Code Style

This project enforces consistent style automatically:

- **Prettier** — single quotes, 4-space indent, 120 char width, trailing commas, LF endings
- **ESLint** — flat config with `typescript-eslint` + Vue plugin + Prettier integration
- **TypeScript** — `strict: true`, no `any`, explicit return types on exports
- **Husky** — pre-commit runs lint-staged (ESLint + Prettier); commit-msg runs commitlint

### File conventions

- Every `.ts` service, composable, and `.vue` component starts with a header comment:
    ```ts
    // FileName — one-line description.
    // Owns: what this file is responsible for.
    // Does NOT own: what belongs elsewhere.
    ```
- Section separators in `.ts` files: `// ─── Label ───────...`
- Keep files under ~300 lines. Split into sub-modules when they grow.

## Reporting Issues

- Use GitHub Issues for bugs and feature requests
- Provide steps to reproduce bugs if possible
- Include your OS version and app version
- Screenshots are helpful!

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Feel free to open a discussion or issue if you need help!
