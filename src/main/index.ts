// Electron Main Process — ZenGarden
// Owns: BrowserWindow setup, IPC registration, app lifecycle, session clearing.
// Does NOT own: data persistence (src/main/services/storage.ts), bridge API (src/preload/index.ts).

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { setupStorageHandlers } from './services/storage';

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    // After electron-vite bundles to out/main/index.js, __dirname resolves to out/main/
    const iconPath =
        process.platform === 'darwin'
            ? path.join(__dirname, '../../build/icon.icns')
            : path.join(__dirname, '../../build/icon.ico');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: iconPath,
        webPreferences: {
            // out/main/__dirname → ../../ → root → out/preload/index.mjs
            preload: path.join(__dirname, '../preload/index.mjs'),
            nodeIntegration: false, // never expose Node to the renderer
            contextIsolation: true, // keep renderer and preload worlds isolated
            // sandbox: false is required for the preload script to use require() via
            // electron-vite's CJS interop. If we ever move to a fully ESM preload
            // that doesn't need require(), this can be removed.
            sandbox: false,
            partition: 'persist:zen-garden',
        },
        backgroundColor: '#1a1a1a',
        titleBarStyle: 'hidden',
        frame: false,
        show: false,
    });

    // Clear leftover web storage so the app stays fully local-data-only
    const { session } = mainWindow.webContents;
    session.clearCache();
    session.clearStorageData({
        storages: ['localstorage', 'cookies', 'indexdb', 'serviceworkers', 'cachestorage'],
    });

    // Load the app — electron-vite injects MAIN_WINDOW_VITE_DEV_SERVER_URL in dev
    if (process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    setupStorageHandlers(ipcMain);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
