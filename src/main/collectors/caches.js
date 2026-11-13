const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runCmd, getDirSizeBytes } = require('./exec');

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getPnpmDetails() {
  const home = os.homedir();
  const [versionOut, storePathOut] = await Promise.all([
    runCmd('pnpm', ['-v']),
    runCmd('pnpm', ['store', 'path']),
  ]);

  const version = versionOut ? versionOut.trim() : null;
  const activeStorePath = storePathOut ? storePathOut.trim() : null;

  const candidatePaths = [
    activeStorePath
      ? {
          id: 'pnpm-active-store',
          name: 'Active Content-Addressable Store',
          path: activeStorePath,
          description: 'Hard-linked package tarball & file store used by all pnpm projects',
          safety: 'safe',
          safetyLabel: 'Use Prune Only',
          whatHappens:
            'Do NOT delete this folder directly if you have active pnpm projects—instead click "Prune Unreferenced Store". Prune safely removes only old packages no longer used by any project.',
          canPrune: true,
        }
      : null,
    {
      id: 'pnpm-library',
      name: 'pnpm Home & State (~/Library/pnpm)',
      path: path.join(home, 'Library', 'pnpm'),
      description: 'Global binaries, dlx cache, and pnpm state',
      safety: 'caution',
      safetyLabel: 'Caution: Global Tools',
      whatHappens:
        'Contains globally installed pnpm CLI tools (pnpm add -g) and the active store. Deleting this removes your global pnpm tools.',
      canPrune: false,
    },
    {
      id: 'pnpm-cache',
      name: 'pnpm Metadata Cache (~/Library/Caches/pnpm)',
      path: path.join(home, 'Library', 'Caches', 'pnpm'),
      description: 'Registry metadata & download cache',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. pnpm will simply re-fetch package metadata from npmjs.org the next time you run pnpm install.',
      canPrune: false,
    },
    {
      id: 'pnpm-legacy-store',
      name: 'Legacy Store (~/.pnpm-store)',
      path: path.join(home, '.pnpm-store'),
      description: 'Older pnpm store location if present',
      safety: 'rebuilds',
      safetyLabel: 'Check Older Projects',
      whatHappens:
        'Only used by older pnpm versions. If all your projects use the active store above, this legacy folder is safe to remove.',
      canPrune: false,
    },
  ].filter(Boolean);

  // Deduplicate if activeStorePath is inside ~/Library/pnpm
  const locations = await Promise.all(
    candidatePaths.map(async (loc) => {
      const present = await exists(loc.path);
      if (!present) return null;
      const sizeBytes = await getDirSizeBytes(loc.path, 12000);
      return { ...loc, sizeBytes };
    })
  );

  const validLocations = locations.filter(Boolean);

  // Avoid double counting if activeStorePath is a subfolder of ~/Library/pnpm
  let totalBytes = 0;
  for (const loc of validLocations) {
    const isChildOfAnother = validLocations.some(
      (other) => other.path !== loc.path && loc.path.startsWith(other.path + path.sep)
    );
    if (!isChildOfAnother) {
      totalBytes += loc.sizeBytes;
    }
  }

  return {
    installed: Boolean(version),
    version,
    activeStorePath,
    totalBytes,
    locations: validLocations,
  };
}

async function getDeveloperCaches() {
  const home = os.homedir();
  const defs = [
    {
      id: 'npm',
      name: 'npm Cache',
      path: path.join(home, '.npm'),
      category: 'Package Manager',
      description: 'Downloaded tarballs & _cacache for npm',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. Existing node_modules folders stay intact; npm will just re-download tarballs on your next npm install.',
    },
    {
      id: 'yarn',
      name: 'Yarn Cache',
      path: path.join(home, 'Library', 'Caches', 'Yarn'),
      category: 'Package Manager',
      description: 'Yarn global package cache',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. Existing projects keep working; Yarn will re-download packages next time you run yarn install.',
    },
    {
      id: 'bun',
      name: 'Bun Install Cache',
      path: path.join(home, '.bun', 'install', 'cache'),
      category: 'Package Manager',
      description: 'Bun package download cache',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. Bun will re-download packages on your next bun install without affecting existing projects.',
    },
    {
      id: 'homebrew',
      name: 'Homebrew Cache',
      path: path.join(home, 'Library', 'Caches', 'Homebrew'),
      category: 'System Tooling',
      description: 'Downloaded bottles and formula archives',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        '100% safe to delete. These are only old installer downloads; your installed Homebrew apps & CLI tools are unaffected.',
    },
    {
      id: 'xcode-derived',
      name: 'Xcode DerivedData',
      path: path.join(home, 'Library', 'Developer', 'Xcode', 'DerivedData'),
      category: 'IDE / Build',
      description: 'Intermediate build artifacts & indexes',
      safety: 'rebuilds',
      safetyLabel: 'Safe (Rebuilds)',
      whatHappens:
        'Safe to delete and often frees gigabytes. Your next Xcode build will be slower once while it re-indexes and recompiles.',
    },
    {
      id: 'xcode-archives',
      name: 'Xcode Archives',
      path: path.join(home, 'Library', 'Developer', 'Xcode', 'Archives'),
      category: 'IDE / Build',
      description: 'Archived iOS/macOS app builds',
      safety: 'caution',
      safetyLabel: 'Caution: App Builds',
      whatHappens:
        'Contains past App Store / TestFlight release archives & dSYM crash symbols. Only delete if you no longer need old build archives.',
    },
    {
      id: 'cocoapods',
      name: 'CocoaPods Cache',
      path: path.join(home, 'Library', 'Caches', 'CocoaPods'),
      category: 'Package Manager',
      description: 'Cached podspecs and pod archives',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. CocoaPods will re-download pods on your next pod install.',
    },
    {
      id: 'pip',
      name: 'pip Cache',
      path: path.join(home, 'Library', 'Caches', 'pip'),
      category: 'Package Manager',
      description: 'Python wheel and source package cache',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. Installed Python virtualenvs are untouched; pip will re-download wheels on future installs.',
    },
    {
      id: 'uv',
      name: 'uv Cache',
      path: path.join(home, '.cache', 'uv'),
      category: 'Package Manager',
      description: 'Astral uv Python package cache',
      safety: 'safe',
      safetyLabel: 'Safe to Clean',
      whatHappens:
        'Safe to delete. Existing Python environments stay intact; uv will re-fetch packages when needed.',
    },
    {
      id: 'gradle',
      name: 'Gradle Caches',
      path: path.join(home, '.gradle', 'caches'),
      category: 'IDE / Build',
      description: 'JVM / Android dependency & build caches',
      safety: 'rebuilds',
      safetyLabel: 'Safe (Rebuilds)',
      whatHappens:
        'Safe to delete. Your next Android/Gradle build will re-download dependencies and take a little longer the first time.',
    },
    {
      id: 'docker',
      name: 'Docker Desktop VM',
      path: path.join(home, 'Library', 'Containers', 'com.docker.docker', 'Data', 'vms'),
      category: 'Containers',
      description: 'Docker virtual machine disk images',
      safety: 'caution',
      safetyLabel: 'Caution: Data Loss',
      whatHappens:
        'WARNING: Deleting this erases ALL Docker images, containers, and volumes! Use `docker system prune` inside Docker instead.',
    },
    {
      id: 'orbstack',
      name: 'OrbStack Data',
      path: path.join(home, 'Library', 'Group Containers', 'HUAQ24HBR6.dev.orbstack', 'data'),
      category: 'Containers',
      description: 'OrbStack containers and Linux VM data',
      safety: 'caution',
      safetyLabel: 'Caution: Data Loss',
      whatHappens:
        'WARNING: Deleting this erases ALL OrbStack Linux machines, containers, and volumes! Clean unused images inside OrbStack instead.',
    },
  ];

  const items = await Promise.all(
    defs.map(async (def) => {
      if (!(await exists(def.path))) return null;
      const sizeBytes = await getDirSizeBytes(def.path, 10000);
      if (sizeBytes <= 0) return null;
      return { ...def, sizeBytes };
    })
  );

  return items.filter(Boolean).sort((a, b) => b.sizeBytes - a.sizeBytes);
}

async function getMacLibraryCaches() {
  const home = os.homedir();
  const cachesDir = path.join(home, 'Library', 'Caches');
  const logsDir = path.join(home, 'Library', 'Logs');
  const trashDir = path.join(home, '.Trash');

  const [cachesTotal, logsTotal, trashTotal] = await Promise.all([
    (await exists(cachesDir)) ? getDirSizeBytes(cachesDir, 12000) : 0,
    (await exists(logsDir)) ? getDirSizeBytes(logsDir, 8000) : 0,
    (await exists(trashDir)) ? getDirSizeBytes(trashDir, 8000) : 0,
  ]);

  let topCaches = [];
  if (await exists(cachesDir)) {
    try {
      const entries = await fs.readdir(cachesDir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory());
      const measured = await Promise.all(
        dirs.map(async (d) => {
          const fullPath = path.join(cachesDir, d.name);
          const sizeBytes = await getDirSizeBytes(fullPath, 6000);
          return {
            name: d.name,
            path: fullPath,
            sizeBytes,
          };
        })
      );
      topCaches = measured
        .filter((m) => m.sizeBytes > 0)
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 20);
    } catch {
      topCaches = [];
    }
  }

  return {
    cachesDir,
    cachesTotalBytes: cachesTotal,
    logsDir,
    logsTotalBytes: logsTotal,
    trashDir,
    trashTotalBytes: trashTotal,
    topCaches,
  };
}

async function getCacheDetails() {
  const [pnpm, devCaches, macCaches] = await Promise.all([
    getPnpmDetails(),
    getDeveloperCaches(),
    getMacLibraryCaches(),
  ]);

  const devTotalBytes = devCaches.reduce((sum, item) => sum + item.sizeBytes, 0);

  return {
    timestamp: Date.now(),
    pnpm,
    devCaches,
    devTotalBytes,
    macCaches,
  };
}

async function prunePnpmStore() {
  const out = await runCmd('pnpm', ['store', 'prune'], 30000);
  return {
    ok: out !== null,
    output: out ? out.trim() : 'Failed to run pnpm store prune.',
  };
}

function isSafeToTrash(targetPath) {
  const home = os.homedir();
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(home + path.sep)) return false;

  const protectedPaths = new Set([
    home,
    path.join(home, 'Library'),
    path.join(home, 'Library', 'Caches'),
    path.join(home, 'Library', 'Logs'),
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(home, 'Downloads'),
    path.join(home, '.Trash'),
  ]);

  return !protectedPaths.has(resolved);
}

module.exports = {
  getCacheDetails,
  prunePnpmStore,
  isSafeToTrash,
};

