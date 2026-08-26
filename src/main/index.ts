/**
 * Electron Main Process — ZenGarden
 * Owns: BrowserWindow setup, IPC registration, app lifecycle, session clearing.
 * Does NOT own: data persistence (src/main/services/db.ts), bridge API (src/preload/index.ts).
 * IPC handler ownership:
 *   auth-service → storage:register, storage:login, storage:logout, storage:getCurrentUser, storage:updateUsername, storage:updatePassword, storage:deleteAccount, storage:updateTheme, storage:updateLanguage, storage:getRecoveryStatus, storage:generateRecoveryCodes, storage:resetPasswordWithRecoveryCode
 *   data-service → storage:createMeditation, storage:getMeditations, storage:saveEmotionLog, storage:getEmotionLogs, storage:getEmotionAnalytics, storage:saveEightfoldPathLog, storage:getEightfoldPathLogs, storage:getEightfoldPathAnalytics
 */
import { BrowserWindow, ipcMain, screen, app, session, shell } from 'electron';
import path from 'path';
import * as authService from '@/main/services/auth';
import * as dataService from '@/main/services/data';
import { log } from '@/main/lib/logger';
import { config } from '@/main/lib/config';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const iconPath = path.join(import.meta.dirname, '../../build/icon.png');

    mainWindow = new BrowserWindow({
        width: Math.round(sw * 0.9),
        height: Math.round(sh * 0.9),
        minWidth: Math.round(sw * 0.45),
        minHeight: Math.round(sh * 0.5),
        icon: iconPath,
        webPreferences: {
            // out/main/ → ../ → out/preload/index.cjs
            preload: path.join(import.meta.dirname, '../preload/index.cjs'),
            nodeIntegration: false, // never expose Node to the renderer
            contextIsolation: true, // keep renderer and preload worlds isolated
            sandbox: true, // requires the CommonJS preload built by electron.vite.config.ts
            partition: 'persist:zen-garden',
        },
        backgroundColor: '#1a1a1a',
        title: '',
        show: false,
    });

    // Clear leftover web storage so the app stays fully local-data-only
    const windowSession = mainWindow.webContents.session;
    void windowSession.clearCache();
    void windowSession.clearStorageData({
        storages: ['localstorage', 'cookies', 'indexdb', 'serviceworkers', 'cachestorage'],
    });

    // Load the app — electron-vite sets the renderer URL in dev mode
    if (config.rendererUrl !== '') {
        void mainWindow.loadURL(config.rendererUrl);
        mainWindow.webContents.openDevTools();
    } else {
        void mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
    }

    // Keep external links out of the app window
    mainWindow.webContents.setWindowOpenHandler(({ url }): { action: 'deny' } => {
        if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url): void => {
        const appOrigin = config.rendererUrl !== '' ? config.rendererUrl : 'file://';
        if (!url.startsWith(appOrigin)) {
            event.preventDefault();
            if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url);
        }
    });

    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

process.on('uncaughtException', (error) => {
    log.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', reason);
});

void app.whenReady().then((): void => {
    const appSession = session.fromPartition('persist:zen-garden');
    appSession.setPermissionRequestHandler((_webContents, _permission, callback): void => {
        callback(false);
    });
    appSession.setPermissionCheckHandler((): boolean => {
        return false;
    });

    authService.register(ipcMain);
    dataService.register(ipcMain);
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

app.on('before-quit', (): void => {
    const appSession = session.fromPartition('persist:zen-garden');
    void appSession.clearCache();
    void appSession.clearStorageData({
        storages: ['localstorage', 'cookies', 'indexdb', 'serviceworkers', 'cachestorage'],
    });
});
