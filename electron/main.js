const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getMachineId } = require('./hardwareFingerprint');
const { TimeGuard } = require('./timeGuard');

let mainWindow = null;
const userDataPath = path.join(app.getPath('userData'), 'AccountsProData');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const timeGuard = new TimeGuard(userDataPath);
const licensePath = path.join(userDataPath, 'license.token');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'AccountsPro (LedgerX) - Enterprise Accounting',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = process.env.ELECTRON_START_URL || (isDev ? 'http://localhost:3000' : 'http://localhost:3000');

  mainWindow.loadURL(startUrl);

  // Record initial time guard tick
  timeGuard.recordTime();

  // Periodic time guard tick every 5 minutes
  setInterval(() => {
    timeGuard.recordTime();
  }, 5 * 60 * 1000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-machine-id', async () => {
  return getMachineId();
});

ipcMain.handle('check-clock-rollback', async () => {
  return timeGuard.isClockRolledBack();
});

ipcMain.handle('record-time-guard', async () => {
  return timeGuard.recordTime();
});

ipcMain.handle('get-offline-token', async () => {
  try {
    if (fs.existsSync(licensePath)) {
      return fs.readFileSync(licensePath, 'utf8');
    }
  } catch (e) {}
  return null;
});

ipcMain.handle('save-offline-token', async (event, token) => {
  try {
    fs.writeFileSync(licensePath, token, 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save offline token:', e);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
