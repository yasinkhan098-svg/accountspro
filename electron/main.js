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
    icon: fs.existsSync(path.join(__dirname, 'app.ico')) ? path.join(__dirname, 'app.ico') : path.join(__dirname, '../public/favicon.ico'),
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

  mainWindow.maximize();
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

const dataDir = path.join(userDataPath, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dataFilePath = path.join(dataDir, 'accounts_offline_data.json');

ipcMain.handle('save-data-file', async (event, data) => {
  try {
    fs.writeFileSync(dataFilePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save data file:', e);
    return false;
  }
});

ipcMain.handle('load-data-file', async () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
});

// Modular Company Data Folders (Tally-Style e.g. data/10001, data/10002)
ipcMain.handle('open-data-folder', async () => {
  const { shell } = require('electron');
  shell.openPath(dataDir);
  return true;
});

ipcMain.handle('scan-company-folders', async () => {
  try {
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });
    const companies = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const cPath = path.join(dataDir, entry.name, 'company.json');
        if (fs.existsSync(cPath)) {
          try {
            const raw = fs.readFileSync(cPath, 'utf8');
            companies.push({ companyCode: entry.name.toUpperCase(), company: JSON.parse(raw) });
          } catch (err) {}
        }
      }
    }
    return companies;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('load-company-folder', async (event, companyCode) => {
  try {
    const cDir = path.join(dataDir, String(companyCode).toUpperCase());
    if (!fs.existsSync(cDir)) return null;
    const read = (f, def = []) => {
      const fp = path.join(cDir, f);
      return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : def;
    };
    return {
      companyCode: String(companyCode).toUpperCase(),
      company: read('company.json', null),
      ledgers: read('ledgers.json', []),
      vouchers: read('vouchers.json', []),
      stockItems: read('stock_items.json', []),
      stockGroups: read('stock_groups.json', []),
      units: read('units.json', []),
      groups: read('groups.json', []),
      voucherTypes: read('voucher_types.json', []),
    };
  } catch (e) {
    return null;
  }
});

ipcMain.handle('save-company-folder', async (event, data) => {
  try {
    const code = String(data.companyCode || data.company?.companyCode || '10001').toUpperCase();
    const cDir = path.join(dataDir, code);
    if (!fs.existsSync(cDir)) fs.mkdirSync(cDir, { recursive: true });
    const write = (f, val) => fs.writeFileSync(path.join(cDir, f), JSON.stringify(val ?? [], null, 2), 'utf8');
    write('company.json', { ...data.company, companyCode: code, updatedAt: new Date().toISOString() });
    if (data.ledgers !== undefined) write('ledgers.json', data.ledgers);
    if (data.vouchers !== undefined) write('vouchers.json', data.vouchers);
    if (data.stockItems !== undefined) write('stock_items.json', data.stockItems);
    if (data.stockGroups !== undefined) write('stock_groups.json', data.stockGroups);
    if (data.units !== undefined) write('units.json', data.units);
    if (data.groups !== undefined) write('groups.json', data.groups);
    if (data.voucherTypes !== undefined) write('voucher_types.json', data.voucherTypes);
    return true;
  } catch (e) {
    console.error('Error saving company folder:', e);
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
