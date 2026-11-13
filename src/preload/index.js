const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cleanUpApi', {
  getMemoryDetails: () => ipcRenderer.invoke('system:get-memory'),
  getStorageOverview: () => ipcRenderer.invoke('system:get-storage'),
  inspectFolder: (targetPath) => ipcRenderer.invoke('system:inspect-folder', targetPath),
  scanNodeModules: () => ipcRenderer.invoke('system:scan-node-modules'),
  getGlobalNpmPackages: () => ipcRenderer.invoke('system:get-global-npm'),
  getCacheDetails: () => ipcRenderer.invoke('system:get-caches'),
  revealInFinder: (targetPath) => ipcRenderer.invoke('action:reveal-in-finder', targetPath),
  prunePnpmStore: () => ipcRenderer.invoke('action:prune-pnpm'),
  trashCacheItem: (targetPath) => ipcRenderer.invoke('action:trash-item', targetPath),
});

