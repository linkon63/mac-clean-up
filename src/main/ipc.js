const { ipcMain, shell } = require('electron');
const { getMemoryDetails } = require('./collectors/memory');
const {
  getStorageOverview,
  inspectFolder,
  scanNodeModules,
  getGlobalNpmPackages,
} = require('./collectors/storage');
const { getCacheDetails, prunePnpmStore, isSafeToTrash } = require('./collectors/caches');

function registerIpcHandlers() {
  ipcMain.handle('system:get-memory', async () => {
    return getMemoryDetails();
  });

  ipcMain.handle('system:get-storage', async () => {
    return getStorageOverview();
  });

  ipcMain.handle('system:inspect-folder', async (_event, targetPath) => {
    return inspectFolder(targetPath);
  });

  ipcMain.handle('system:scan-node-modules', async () => {
    return scanNodeModules();
  });

  ipcMain.handle('system:get-global-npm', async () => {
    return getGlobalNpmPackages();
  });

  ipcMain.handle('system:get-caches', async () => {
    return getCacheDetails();
  });

  ipcMain.handle('action:reveal-in-finder', async (_event, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') {
      return { ok: false, error: 'Invalid path' };
    }
    shell.showItemInFolder(targetPath);
    return { ok: true };
  });

  ipcMain.handle('action:prune-pnpm', async () => {
    return prunePnpmStore();
  });

  ipcMain.handle('action:trash-item', async (_event, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string' || !isSafeToTrash(targetPath)) {
      return { ok: false, error: 'Path is protected or outside your home directory.' };
    }
    try {
      await shell.trashItem(targetPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'Failed to move item to Trash.' };
    }
  });
}

module.exports = {
  registerIpcHandlers,
};

