// Electron Main Process - This runs Node.js code locally on user's computer
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupStorageHandlers } = require('./storage.cjs');

let mainWindow = null;

function createWindow() {
    // Set app icon based on platform
    const iconPath = process.platform === 'darwin'
        ? path.join(__dirname, '../build/icon.icns')
        : path.join(__dirname, '../build/icon.ico');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false, // Security: don't expose Node to renderer
            contextIsolation: true,  // Security: isolate contexts
            sandbox: false,
            // Disable all browser-like storage mechanisms
            partition: 'persist:zen-garden', // Use persistent session but we'll clear cache
            cache: false // Disable HTTP cache
        },
        backgroundColor: '#1a1a1a',
        titleBarStyle: 'hidden', // Cross-platform hidden titlebar
        frame: false, // Frameless window for custom controls
        show: false // Don't show until ready
    });

    // Disable all Electron session storage
    const session = mainWindow.webContents.session;
    session.clearCache();
    session.clearStorageData({
        storages: ['localstorage', 'sessionstorage', 'cookies', 'indexdb', 'serviceworkers', 'cachestorage']
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize app
app.whenReady().then(() => {
    // Setup database and IPC handlers
    setupStorageHandlers(ipcMain);

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
