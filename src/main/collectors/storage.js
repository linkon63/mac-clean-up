const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runCmd, getDirSizeBytes } = require('./exec');
const { isSafeToTrash } = require('./caches');

async function getDiskVolumeInfo() {
  let dfOut = await runCmd('df', ['-k', '/System/Volumes/Data']);
  let targetMount = '/System/Volumes/Data';
  if (!dfOut) {
    dfOut = await runCmd('df', ['-k', '/']);
    targetMount = '/';
  }

  let totalBytes = 0;
  let usedBytes = 0;
  let availableBytes = 0;
  let capacityPercent = 0;

  if (dfOut) {
    const lines = dfOut.trim().split('\n');
    const dataLine = lines[lines.length - 1];
    const parts = dataLine.trim().split(/\s+/);
    if (parts.length >= 5) {
      totalBytes = Number.parseInt(parts[1], 10) * 1024;
      usedBytes = Number.parseInt(parts[2], 10) * 1024;
      availableBytes = Number.parseInt(parts[3], 10) * 1024;
      const pct = Number.parseInt(parts[4].replace('%', ''), 10);
      capacityPercent = Number.isNaN(pct) ? 0 : pct;
    }
  }

  const diskInfoOut = await runCmd('diskutil', ['info', targetMount]);
  let volumeName = 'Macintosh HD';
  let fileSystem = 'APFS';
  let purgeableBytes = 0;

  if (diskInfoOut) {
    const nameMatch = diskInfoOut.match(/Volume Name:\s+(.+)/);
    if (nameMatch) volumeName = nameMatch[1].trim();
    const fsMatch =
      diskInfoOut.match(/Type \(Bundle\):\s+(.+)/) ||
      diskInfoOut.match(/File System Personality:\s+(.+)/);
    if (fsMatch) fileSystem = fsMatch[1].trim();
    const purgeMatch = diskInfoOut.match(/Container Free Space:\s+[\d.]+\s+\w+\s+\((\d+)\s+Bytes\)/);
    if (purgeMatch && availableBytes > 0) {
      const containerFree = Number.parseInt(purgeMatch[1], 10);
      if (containerFree > availableBytes) {
        purgeableBytes = containerFree - availableBytes;
      }
    }
  }

  const effectiveUsedBytes =
    totalBytes > 0 && availableBytes >= 0 ? Math.max(usedBytes, totalBytes - availableBytes) : usedBytes;
  const effectivePercent =
    totalBytes > 0 ? Number(((effectiveUsedBytes / totalBytes) * 100).toFixed(1)) : capacityPercent;

  return {
    volumeName,
    fileSystem,
    mountPoint: targetMount,
    totalBytes,
    usedBytes: effectiveUsedBytes,
    availableBytes,
    purgeableBytes,
    usedPercent: effectivePercent,
  };
}

async function getHomeBreakdown() {
  const homeDir = os.homedir();
  const categoryMap = new Map([
    ['Library', 'System & App Data'],
    ['Downloads', 'User Files'],
    ['Documents', 'User Files'],
    ['Desktop', 'User Files'],
    ['Applications', 'Applications'],
    ['Movies', 'Media'],
    ['Pictures', 'Media'],
    ['Music', 'Media'],
  ]);

  let entries = [];
  try {
    entries = await fs.readdir(homeDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = entries.filter((e) => e.isDirectory() && !e.isSymbolicLink());

  const results = await Promise.all(
    dirs.map(async (entry) => {
      const fullPath = path.join(homeDir, entry.name);
      const sizeBytes = await getDirSizeBytes(fullPath, 25000);
      return {
        name: entry.name,
        path: fullPath,
        category: categoryMap.get(entry.name) || (entry.name.startsWith('.') ? 'Hidden / Cache' : 'Workspace / Custom'),
        sizeBytes,
        canTrash: isSafeToTrash(fullPath),
      };
    })
  );

  return results
    .filter((r) => r.sizeBytes > 0)
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
}

async function inspectFolder(targetPath) {
  const homeDir = os.homedir();
  const resolved = path.resolve(targetPath || homeDir);

  // Restrict browsing to user's home directory for safety
  if (resolved !== homeDir && !resolved.startsWith(homeDir + path.sep)) {
    return { path: homeDir, items: [], error: 'Access limited to home directory.' };
  }

  let entries = [];
  try {
    entries = await fs.readdir(resolved, { withFileTypes: true });
  } catch (err) {
    return { path: resolved, items: [], error: err?.message || 'Unable to read folder.' };
  }

  // Measure up to 60 entries to keep UI snappy
  const limited = entries.slice(0, 60);
  const items = await Promise.all(
    limited.map(async (entry) => {
      const fullPath = path.join(resolved, entry.name);
      try {
        const stat = await fs.lstat(fullPath);
        if (stat.isSymbolicLink()) return null;
        const isDirectory = entry.isDirectory();
        const sizeBytes = isDirectory
          ? await getDirSizeBytes(fullPath, 15000)
          : stat.size;
        return {
          name: entry.name,
          path: fullPath,
          isDirectory,
          sizeBytes,
          mtimeMs: stat.mtimeMs,
          canTrash: isSafeToTrash(fullPath),
        };
      } catch {
        return null;
      }
    })
  );

  return {
    path: resolved,
    parentPath: resolved === homeDir ? null : path.dirname(resolved),
    items: items
      .filter((i) => i && i.sizeBytes > 0)
      .sort((a, b) => b.sizeBytes - a.sizeBytes),
  };
}

async function scanNodeModules() {
  const homeDir = os.homedir();
  const skipDirs = new Set([
    'Library',
    '.Trash',
    '.npm',
    '.pnpm-store',
    '.cache',
    '.git',
    'Applications',
    'Pictures',
    'Movies',
    'Music',
    '.orbstack',
    '.docker',
  ]);

  const found = [];

  async function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (entry.name === 'node_modules') {
        found.push(path.join(dir, 'node_modules'));
        continue; // Do not recurse inside node_modules
      }
      if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }

  await walk(homeDir, 0);

  const now = Date.now();
  const detailed = await Promise.all(
    found.map(async (nmPath) => {
      const projectDir = path.dirname(nmPath);
      const projectName = path.basename(projectDir);
      const sizeBytes = await getDirSizeBytes(nmPath, 15000);
      if (sizeBytes <= 0) return null;

      let pkgName = projectName;
      let latestMtimeMs = 0;

      try {
        const nmStat = await fs.stat(nmPath);
        latestMtimeMs = Math.max(latestMtimeMs, nmStat.mtimeMs);
      } catch {
        // ignore
      }

      try {
        const pkgPath = path.join(projectDir, 'package.json');
        const pkgStat = await fs.stat(pkgPath);
        latestMtimeMs = Math.max(latestMtimeMs, pkgStat.mtimeMs);
        const raw = await fs.readFile(pkgPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.name) pkgName = parsed.name;
      } catch {
        // ignore missing/invalid package.json
      }

      for (const lockName of ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']) {
        try {
          const lockStat = await fs.stat(path.join(projectDir, lockName));
          latestMtimeMs = Math.max(latestMtimeMs, lockStat.mtimeMs);
        } catch {
          // ignore
        }
      }

      const daysUnused = latestMtimeMs
        ? Math.max(0, Math.floor((now - latestMtimeMs) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        id: nmPath,
        projectName: pkgName,
        folderName: projectName,
        projectPath: projectDir,
        nodeModulesPath: nmPath,
        sizeBytes,
        lastModifiedMs: latestMtimeMs,
        daysUnused,
        canTrash: isSafeToTrash(nmPath),
      };
    })
  );

  const valid = detailed.filter(Boolean).sort((a, b) => b.sizeBytes - a.sizeBytes);
  const totalBytes = valid.reduce((sum, item) => sum + item.sizeBytes, 0);

  return {
    totalBytes,
    count: valid.length,
    items: valid,
  };
}

async function getGlobalNpmPackages() {
  const [rootOut, lsOut] = await Promise.all([
    runCmd('npm', ['root', '-g']),
    runCmd('npm', ['ls', '-g', '--depth=0', '--json']),
  ]);

  const globalRoot = rootOut ? rootOut.trim() : null;
  let deps = {};
  if (lsOut) {
    try {
      const parsed = JSON.parse(lsOut);
      deps = parsed.dependencies || {};
    } catch {
      deps = {};
    }
  }

  const now = Date.now();
  const names = Object.keys(deps);
  const packages = await Promise.all(
    names.map(async (name) => {
      const info = deps[name] || {};
      const pkgPath = globalRoot ? path.join(globalRoot, name) : null;
      let sizeBytes = 0;
      let daysUnused = 0;
      let lastModifiedMs = 0;

      if (pkgPath) {
        try {
          const stat = await fs.stat(pkgPath);
          lastModifiedMs = stat.mtimeMs;
          daysUnused = Math.max(0, Math.floor((now - stat.mtimeMs) / (1000 * 60 * 60 * 24)));
          sizeBytes = await getDirSizeBytes(pkgPath, 8000);
        } catch {
          // ignore
        }
      }

      return {
        name,
        version: info.version || 'unknown',
        path: pkgPath,
        sizeBytes,
        lastModifiedMs,
        daysUnused,
      };
    })
  );

  return {
    globalRoot,
    packages: packages.sort((a, b) => b.daysUnused - a.daysUnused || b.sizeBytes - a.sizeBytes),
  };
}

async function getStorageOverview() {
  const [volume, homeBreakdown] = await Promise.all([
    getDiskVolumeInfo(),
    getHomeBreakdown(),
  ]);

  return {
    timestamp: Date.now(),
    volume,
    homeBreakdown,
  };
}

module.exports = {
  getStorageOverview,
  inspectFolder,
  scanNodeModules,
  getGlobalNpmPackages,
};
