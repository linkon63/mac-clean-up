import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  File as FileIcon,
  Folder,
  FolderOpen,
  HardDrive,
  Package,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { formatBytes } from '@/lib/utils';

export function StorageView({
  data,
  loading,
  onRefresh,
  onRevealInFinder,
  onTrashItem,
}) {
  const [subTab, setSubTab] = useState('explorer'); // 'explorer' | 'node_modules' | 'global_npm'

  // Folder drill-down state
  const [currentFolder, setCurrentFolder] = useState(null); // null = top-level ~
  const [folderItems, setFolderItems] = useState(null);
  const [folderLoading, setFolderLoading] = useState(false);

  // node_modules scanner state
  const [nmData, setNmData] = useState(null);
  const [nmLoading, setNmLoading] = useState(false);
  const [nmSort, setNmSort] = useState('size'); // 'size' | 'unused'

  // Global npm packages state
  const [globalNpm, setGlobalNpm] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Confirmation dialog
  const [confirmState, setConfirmState] = useState({ open: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  const openFolder = async (folderPath) => {
    setFolderLoading(true);
    try {
      const res = await window.cleanUpApi.inspectFolder(folderPath);
      setCurrentFolder(res.path);
      setFolderItems(res);
    } finally {
      setFolderLoading(false);
    }
  };

  const loadNodeModules = async () => {
    setNmLoading(true);
    try {
      const res = await window.cleanUpApi.scanNodeModules();
      setNmData(res);
    } finally {
      setNmLoading(false);
    }
  };

  const loadGlobalNpm = async () => {
    setGlobalLoading(true);
    try {
      const res = await window.cleanUpApi.getGlobalNpmPackages();
      setGlobalNpm(res);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'node_modules' && !nmData && !nmLoading) {
      loadNodeModules();
    } else if (subTab === 'global_npm' && !globalNpm && !globalLoading) {
      loadGlobalNpm();
    }
  }, [subTab, nmData, nmLoading, globalNpm, globalLoading]);

  const sortedNodeModules = useMemo(() => {
    if (!nmData?.items) return [];
    const copy = [...nmData.items];
    if (nmSort === 'unused') {
      return copy.sort((a, b) => b.daysUnused - a.daysUnused || b.sizeBytes - a.sizeBytes);
    }
    return copy.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }, [nmData, nmSort]);

  const askTrash = ({ name, path, impactNote, onAfterTrash }) => {
    setConfirmState({
      open: true,
      targetPath: path,
      title: `Move "${name}" to Trash?`,
      description:
        'This moves the selected folder or file to macOS Trash. You can restore it from Trash if needed.',
      impactNote,
      pathPreview: path,
      onAfterTrash,
    });
  };

  const handleConfirmTrash = async () => {
    setActionLoading(true);
    try {
      const res = await onTrashItem(confirmState.targetPath);
      setStatusBanner({
        ok: res.ok,
        text: res.ok
          ? `Moved to Trash: ${confirmState.targetPath}`
          : res.error || 'Failed to move item to Trash.',
      });
      if (res.ok && confirmState.onAfterTrash) {
        await confirmState.onAfterTrash();
      }
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false });
    }
  };

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Scanning macOS storage volumes &amp; home folders...
      </div>
    );
  }

  const { volume, homeBreakdown } = data;
  const activeExplorerList = currentFolder ? folderItems?.items || [] : homeBreakdown;
  const maxFolderSize = activeExplorerList[0]?.sizeBytes || 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Full Storage &amp; Module Inspector
          </h2>
          <p className="text-xs text-zinc-400">
            Drill down into any folder, track heavy/unused node_modules, and inspect global npm packages
          </p>
        </div>

        <Button variant="glass" size="md" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rescan Disk
        </Button>
      </div>

      {/* Volume Overview */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/15">
              <HardDrive className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{volume.volumeName}</h3>
                <Badge variant="violet">{volume.fileSystem}</Badge>
              </div>
              <p className="text-xs text-zinc-400">Mount: {volume.mountPoint}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-semibold text-white">
              {formatBytes(volume.usedBytes)}{' '}
              <span className="text-sm font-normal text-zinc-400">
                / {formatBytes(volume.totalBytes)}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              {formatBytes(volume.availableBytes)} available
              {volume.purgeableBytes > 0 && ` • ${formatBytes(volume.purgeableBytes)} purgeable`}
            </div>
          </div>
        </div>

        <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-white/8 p-0.5">
          <div
            style={{ width: `${Math.min(100, volume.usedPercent)}%` }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-500"
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-400">
          <span>{volume.usedPercent}% used</span>
          <span>{(100 - volume.usedPercent).toFixed(1)}% free</span>
        </div>
      </GlassCard>

      {statusBanner && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs ${
            statusBanner.ok
              ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
              : 'border-rose-400/30 bg-rose-500/15 text-rose-100'
          }`}
        >
          <span className="font-mono">{statusBanner.text}</span>
          <button
            onClick={() => setStatusBanner(null)}
            className="ml-4 text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-tab Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSubTab('explorer')}
          className={`no-drag rounded-xl px-4 py-2 text-xs font-medium transition cursor-pointer ${
            subTab === 'explorer'
              ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-white border border-white/15'
              : 'bg-white/5 text-zinc-400 hover:text-white border border-white/8'
          }`}
        >
          Folder Explorer (Drill-Down)
        </button>
        <button
          onClick={() => setSubTab('node_modules')}
          className={`no-drag rounded-xl px-4 py-2 text-xs font-medium transition cursor-pointer ${
            subTab === 'node_modules'
              ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-white border border-white/15'
              : 'bg-white/5 text-zinc-400 hover:text-white border border-white/8'
          }`}
        >
          node_modules Tracker {nmData ? `(${nmData.count})` : ''}
        </button>
        <button
          onClick={() => setSubTab('global_npm')}
          className={`no-drag rounded-xl px-4 py-2 text-xs font-medium transition cursor-pointer ${
            subTab === 'global_npm'
              ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-white border border-white/15'
              : 'bg-white/5 text-zinc-400 hover:text-white border border-white/8'
          }`}
        >
          Global npm Packages {globalNpm ? `(${globalNpm.packages.length})` : ''}
        </button>
      </div>

      {/* 1. Folder Drill-Down Explorer */}
      {subTab === 'explorer' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              {currentFolder && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    if (folderItems?.parentPath && currentFolder !== folderItems.parentPath) {
                      openFolder(folderItems.parentPath);
                    } else {
                      setCurrentFolder(null);
                      setFolderItems(null);
                    }
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {currentFolder ? 'Folder Contents' : 'Home Directory Breakdown (~)'}
                </h3>
                <p className="truncate font-mono text-[11px] text-zinc-400">
                  {currentFolder || 'Click any folder below to inspect what is inside it'}
                </p>
              </div>
            </div>

            {currentFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentFolder(null);
                  setFolderItems(null);
                }}
              >
                Reset to ~
              </Button>
            )}
          </div>

          {folderLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Calculating subfolder sizes...
            </div>
          ) : activeExplorerList.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No items found in this folder.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-white/6">
              {activeExplorerList.map((item) => {
                const isDir = item.isDirectory !== false;
                const pct = Math.max(2, (item.sizeBytes / maxFolderSize) * 100);
                return (
                  <div
                    key={item.path}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div
                      onClick={() => isDir && openFolder(item.path)}
                      className={`min-w-0 flex-1 ${isDir ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {isDir ? (
                          <Folder className="h-4 w-4 text-cyan-300 shrink-0" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="truncate text-sm font-medium text-zinc-100">
                          {item.name}
                        </span>
                        {item.category && (
                          <Badge variant="default" className="text-[10px] py-0">
                            {item.category}
                          </Badge>
                        )}
                        {isDir && <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                        {item.path}
                      </div>
                      <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/8">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="mr-1 text-sm font-semibold text-cyan-200">
                        {formatBytes(item.sizeBytes)}
                      </span>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => onRevealInFinder(item.path)}
                        title="Reveal in Finder"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </Button>
                      {item.canTrash && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            askTrash({
                              name: item.name,
                              path: item.path,
                              impactNote:
                                item.name === 'node_modules'
                                  ? 'Safe to delete! Your source code and package.json remain untouched. Run pnpm/npm install anytime to restore.'
                                  : 'Make sure you do not need the files inside this folder. Moving to Trash is reversible via macOS Trash.',
                              onAfterTrash: async () => {
                                if (currentFolder) await openFolder(currentFolder);
                                await onRefresh();
                              },
                            })
                          }
                          title="Move to Trash"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* 2. node_modules Tracker */}
      {subTab === 'node_modules' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Project node_modules Scanner
              </h3>
              <p className="text-xs text-zinc-400">
                {nmData
                  ? `${nmData.count} node_modules folders using ${formatBytes(nmData.totalBytes)} total`
                  : 'Scanning projects in your home directory...'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={nmSort}
                onChange={(e) => setNmSort(e.target.value)}
                className="no-drag h-8 rounded-xl border border-white/12 bg-white/8 px-3 text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="size" className="bg-zinc-900">Sort: Largest First</option>
                <option value="unused" className="bg-zinc-900">Sort: Unused Longest</option>
              </select>
              <Button variant="glass" size="sm" onClick={loadNodeModules} disabled={nmLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${nmLoading ? 'animate-spin' : ''}`} />
                Rescan
              </Button>
            </div>
          </div>

          {nmLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Scanning your projects for node_modules folders...
            </div>
          ) : sortedNodeModules.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No node_modules folders found in your home projects.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-white/6">
              {sortedNodeModules.map((item) => {
                const stale = item.daysUnused >= 30;
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="h-4 w-4 text-amber-300 shrink-0" />
                        <span className="text-sm font-medium text-zinc-100">
                          {item.projectName}
                        </span>
                        <Badge variant={stale ? 'amber' : 'emerald'} className="text-[10px] py-0">
                          <Clock className="h-3 w-3" />
                          {item.daysUnused === 0
                            ? 'Active today'
                            : `Unused ${item.daysUnused}d`}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                        {item.nodeModulesPath}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="mr-1 text-sm font-semibold text-amber-200">
                        {formatBytes(item.sizeBytes)}
                      </span>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => onRevealInFinder(item.nodeModulesPath)}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          askTrash({
                            name: `${item.projectName}/node_modules`,
                            path: item.nodeModulesPath,
                            impactNote:
                              '100% safe to delete for inactive projects. Your source code and package.json stay untouched—just run `pnpm install` or `npm install` if you work on this project again.',
                            onAfterTrash: async () => {
                              await loadNodeModules();
                              await onRefresh();
                            },
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Module
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* 3. Global npm Packages */}
      {subTab === 'global_npm' && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Global npm Packages (Sorted by Longest Unused)
              </h3>
              <p className="text-xs text-zinc-400">
                Root: <span className="font-mono">{globalNpm?.globalRoot || 'Detecting...'}</span>
              </p>
            </div>
            <Button variant="glass" size="sm" onClick={loadGlobalNpm} disabled={globalLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${globalLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {globalLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Checking global npm packages...
            </div>
          ) : !globalNpm?.packages?.length ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No global npm packages found.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-white/6">
              {globalNpm.packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{pkg.name}</span>
                      <Badge variant="default" className="text-[10px] py-0">
                        v{pkg.version}
                      </Badge>
                      <Badge
                        variant={pkg.daysUnused >= 60 ? 'amber' : 'default'}
                        className="text-[10px] py-0"
                      >
                        <Clock className="h-3 w-3" />
                        {pkg.daysUnused === 0
                          ? 'Modified today'
                          : `Untouched ${pkg.daysUnused}d`}
                      </Badge>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
                      To uninstall: npm uninstall -g {pkg.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-cyan-200">
                      {formatBytes(pkg.sizeBytes)}
                    </span>
                    {pkg.path && (
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => onRevealInFinder(pkg.path)}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactNote={confirmState.impactNote}
        pathPreview={confirmState.pathPreview}
        confirmLabel="Move to Trash"
        danger
        loading={actionLoading}
        onConfirm={handleConfirmTrash}
        onCancel={() => setConfirmState({ open: false })}
      />
    </div>
  );
}
