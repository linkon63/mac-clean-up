import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Info,
  Layers,
  Package,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { formatBytes } from '@/lib/utils';

function getSafetyVariant(safety) {
  if (safety === 'safe') return 'emerald';
  if (safety === 'rebuilds') return 'amber';
  if (safety === 'caution') return 'rose';
  return 'default';
}

export function CachesView({
  data,
  loading,
  onRefresh,
  onRevealInFinder,
  onPrunePnpm,
  onTrashItem,
}) {
  const [confirmState, setConfirmState] = useState({ open: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [guideOpen, setGuideOpen] = useState(true);

  const openPruneConfirm = () => {
    setConfirmState({
      open: true,
      type: 'prune-pnpm',
      title: 'Prune pnpm Store?',
      description:
        'This runs `pnpm store prune` to safely remove unreferenced packages that are no longer used by any project on your Mac.',
      impactNote:
        'Your active projects keep working 100% normally. Only unused old package versions are removed. If an older project needs one later, pnpm re-downloads it automatically.',
      pathPreview: data?.pnpm?.activeStorePath || '',
      confirmLabel: 'Prune Store',
      danger: false,
    });
  };

  const openTrashConfirm = (item, fallbackImpact) => {
    setConfirmState({
      open: true,
      type: 'trash',
      targetPath: item.path,
      title: `Move "${item.name}" to Trash?`,
      description:
        'This moves the selected cache folder to the macOS Trash. Nothing is permanently erased until you empty Trash.',
      impactNote: item.whatHappens || fallbackImpact,
      pathPreview: item.path,
      confirmLabel: 'Move to Trash',
      danger: true,
    });
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      if (confirmState.type === 'prune-pnpm') {
        const res = await onPrunePnpm();
        setStatusBanner({
          ok: res.ok,
          text: res.output || 'pnpm store pruned.',
        });
      } else if (confirmState.type === 'trash') {
        const res = await onTrashItem(confirmState.targetPath);
        setStatusBanner({
          ok: res.ok,
          text: res.ok
            ? `Moved to Trash: ${confirmState.targetPath}`
            : res.error || 'Failed to move to Trash.',
        });
      }
    } finally {
      setActionLoading(false);
      setConfirmState({ open: false });
    }
  };

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Inspecting pnpm store, developer caches & macOS Library caches...
      </div>
    );
  }

  const { pnpm, devCaches, devTotalBytes, macCaches } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Caches & pnpm Details
          </h2>
          <p className="text-xs text-zinc-400">
            Inspect pnpm store, package managers, build caches, and ~/Library/Caches with safety guidance
          </p>
        </div>

        <Button variant="glass" size="md" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rescan Caches
        </Button>
      </div>

      {/* Built-in Cleanup Guide */}
      <GlassCard className="border-cyan-400/25 bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-violet-500/[0.08]">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="no-drag flex w-full items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-cyan-300 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Cleanup Guide: Which Caches Should You Delete & What Happens?
              </h3>
              <p className="text-xs text-zinc-400">
                Every Trash action moves files to macOS Trash (reversible). Read the safety badge before cleaning:
              </p>
            </div>
          </div>
          {guideOpen ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {guideOpen && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
              <Badge variant="emerald">Safe to Clean</Badge>
              <p className="mt-2 text-xs leading-relaxed text-zinc-200">
                <strong>npm, yarn, bun, Homebrew, pip, uv, pnpm metadata:</strong> Deleting these frees space immediately. Your existing apps and projects keep working; tools simply re-download packages if needed later.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3">
              <Badge variant="amber">Safe (Rebuilds)</Badge>
              <p className="mt-2 text-xs leading-relaxed text-zinc-200">
                <strong>Xcode DerivedData, Gradle, App Caches:</strong> Safe to delete and often frees gigabytes. Your next build or app launch will be slightly slower once while it rebuilds fresh cache files.
              </p>
            </div>
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3">
              <Badge variant="rose">Caution: Check First</Badge>
              <p className="mt-2 text-xs leading-relaxed text-zinc-200">
                <strong>Docker, OrbStack, Xcode Archives, ~/Library/pnpm:</strong> These contain real VM data, containers, or global CLI tools. Do <strong>not</strong> Trash them unless you are sure you don&apos;t need them—use <code className="text-rose-200">Prune</code> instead where available.
              </p>
            </div>
          </div>
        )}
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

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <span className="text-xs font-medium text-zinc-400">pnpm Total Footprint</span>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(pnpm.totalBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {pnpm.installed ? `pnpm v${pnpm.version}` : 'pnpm not detected'}
          </div>
        </GlassCard>

        <GlassCard>
          <span className="text-xs font-medium text-zinc-400">Developer Caches</span>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(devTotalBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {devCaches.length} cache locations found
          </div>
        </GlassCard>

        <GlassCard>
          <span className="text-xs font-medium text-zinc-400">~/Library/Caches</span>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(macCaches.cachesTotalBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Logs: {formatBytes(macCaches.logsTotalBytes)}
          </div>
        </GlassCard>

        <GlassCard>
          <span className="text-xs font-medium text-zinc-400">macOS Trash</span>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(macCaches.trashTotalBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            ~/.Trash (Empty Trash in Finder to reclaim)
          </div>
        </GlassCard>
      </div>

      {/* Dedicated pnpm Section */}
      <GlassCard className="border-cyan-400/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-orange-500/25 border border-amber-400/30">
              <Package className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">pnpm Store & Cache</h3>
                {pnpm.version && <Badge variant="amber">v{pnpm.version}</Badge>}
              </div>
              <p className="text-xs text-zinc-400">
                Active store path:{' '}
                <span className="font-mono text-zinc-200">
                  {pnpm.activeStorePath || 'Unavailable'}
                </span>
              </p>
            </div>
          </div>

          {pnpm.installed && (
            <Button variant="primary" size="sm" onClick={openPruneConfirm}>
              <Scissors className="h-3.5 w-3.5" />
              Prune Unreferenced Store
            </Button>
          )}
        </div>

        <div className="mt-4 divide-y divide-white/6">
          {pnpm.locations.length === 0 ? (
            <div className="py-4 text-xs text-zinc-400">No pnpm store or cache folders found.</div>
          ) : (
            pnpm.locations.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{loc.name}</span>
                    {loc.safetyLabel && (
                      <Badge variant={getSafetyVariant(loc.safety)} className="text-[10px] py-0">
                        {loc.safetyLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{loc.description}</div>
                  {loc.whatHappens && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px] leading-relaxed text-zinc-300">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      <span>{loc.whatHappens}</span>
                    </div>
                  )}
                  <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                    {loc.path}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-semibold text-amber-200">
                    {formatBytes(loc.sizeBytes)}
                  </span>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => onRevealInFinder(loc.path)}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Finder
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Developer & Build Caches */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Developer & Build Caches</h3>
            <p className="text-xs text-zinc-400">
              Package managers, Homebrew, Xcode, Python, JVM, and Container caches
            </p>
          </div>
          <Badge variant="cyan">{formatBytes(devTotalBytes)}</Badge>
        </div>

        {devCaches.length === 0 ? (
          <div className="p-5 text-xs text-zinc-400">No developer caches detected.</div>
        ) : (
          <div className="divide-y divide-white/6">
            {devCaches.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{item.name}</span>
                    <Badge variant="default" className="text-[10px] py-0">
                      {item.category}
                    </Badge>
                    {item.safetyLabel && (
                      <Badge variant={getSafetyVariant(item.safety)} className="text-[10px] py-0">
                        {item.safetyLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{item.description}</div>
                  {item.whatHappens && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px] leading-relaxed text-zinc-300">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      <span>{item.whatHappens}</span>
                    </div>
                  )}
                  <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                    {item.path}
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
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Finder
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openTrashConfirm(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Trash
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* macOS ~/Library/Caches Top Folders */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-300" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Top App Caches in ~/Library/Caches
              </h3>
              <p className="text-xs text-zinc-400">
                Close an app before trashing its cache. Your logins, settings &amp; bookmarks are NOT stored here—the app will rebuild fresh cache files next time you open it.
              </p>
            </div>
          </div>
          <Badge variant="violet">{formatBytes(macCaches.cachesTotalBytes)}</Badge>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-white/6">
          {macCaches.topCaches.map((item) => (
            <div
              key={item.path}
              className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-100">{item.name}</div>
                <div className="truncate font-mono text-[11px] text-zinc-500">{item.path}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="mr-1 text-xs font-semibold text-violet-200">
                  {formatBytes(item.sizeBytes)}
                </span>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => onRevealInFinder(item.path)}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    openTrashConfirm(
                      item,
                      'App caches store temporary downloads, thumbnails, and web assets. Close the app first if it is running; it will recreate fresh cache files automatically on next launch without losing your personal data.'
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        impactNote={confirmState.impactNote}
        pathPreview={confirmState.pathPreview}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        loading={actionLoading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />
    </div>
  );
}
