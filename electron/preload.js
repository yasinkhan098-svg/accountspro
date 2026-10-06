const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktopApp: true,
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  checkClockRollback: () => ipcRenderer.invoke('check-clock-rollback'),
  getOfflineToken: () => ipcRenderer.invoke('get-offline-token'),
  saveOfflineToken: (token) => ipcRenderer.invoke('save-offline-token', token),
  recordTimeGuard: () => ipcRenderer.invoke('record-time-guard'),
  syncStatus: (status) => ipcRenderer.send('sync-status-update', status),
  onSyncTrigger: (callback) => ipcRenderer.on('trigger-sync', () => callback()),
});
