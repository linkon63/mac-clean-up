import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Cpu,
  RefreshCw,
  Search,
} from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatBytes } from '@/lib/utils';

export function MemoryView({
  data,
  loading,
  refreshInterval,
  onChangeRefreshInterval,
  onRefresh,
}) {
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'raw'
  const [search, setSearch] = useState('');
  const [expandedApps, setExpandedApps] = useState({});

  const toggleApp = (appName) => {
    setExpandedApps((prev) => ({ ...prev, [appName]: !prev[appName] }));
  };

  const filteredGroups = useMemo(() => {
    if (!data?.groupedApps) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.groupedApps;
    return data.groupedApps.filter(
      (g) =>
        g.appName.toLowerCase().includes(q) ||
        g.processes.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [data, search]);

  const filteredProcesses = useMemo(() => {
    if (!data?.processes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.processes;
    return data.processes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.appName.toLowerCase().includes(q) ||
        String(p.pid).includes(q)
    );
  }, [data, search]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Loading macOS memory telemetry...
      </div>
    );
  }

  const total = data.totalBytes || 1;
  const activePct = ((data.breakdown.activeBytes / total) * 100).toFixed(1);
  const wiredPct = ((data.breakdown.wiredBytes / total) * 100).toFixed(1);
  const compressedPct = ((data.breakdown.compressedBytes / total) * 100).toFixed(1);

  const pressureVariant =
    data.pressure === 'High'
      ? 'rose'
      : data.pressure === 'Moderate'
        ? 'amber'
        : 'emerald';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Memory & Top Consumers
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time RAM breakdown and apps using the most memory on your Mac
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={refreshInterval}
            onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
            className="no-drag h-9 rounded-xl border border-white/12 bg-white/8 px-3 text-xs text-zinc-200 outline-none backdrop-blur-md cursor-pointer"
          >
            <option value={2000} className="bg-zinc-900">Auto: 2s</option>
            <option value={5000} className="bg-zinc-900">Auto: 5s</option>
            <option value={0} className="bg-zinc-900">Manual</option>
          </select>

          <Button variant="glass" size="md" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Memory Used</span>
            <Badge variant={pressureVariant}>{data.pressure} Pressure</Badge>
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(data.usedBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            of {formatBytes(data.totalBytes)} ({data.usedPercent}%)
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">App / Active</span>
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(data.breakdown.activeBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Wired: {formatBytes(data.breakdown.wiredBytes)}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Compressed</span>
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(data.breakdown.compressedBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Cached files: {formatBytes(data.breakdown.inactiveBytes)}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Swap Used</span>
            <Activity className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {formatBytes(data.swap.usedBytes)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Total swap: {formatBytes(data.swap.totalBytes)}
          </div>
        </GlassCard>
      </div>

      {/* Visual Breakdown Bar */}
      <GlassCard>
        <div className="mb-2.5 flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-200">Physical Memory Allocation</span>
          <span className="text-zinc-400">
            Available / Free: {formatBytes(data.freeBytes)}
          </span>
        </div>
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-white/8 p-0.5">
          <div
            style={{ width: `${activePct}%` }}
            className="h-full rounded-l-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            title={`Active: ${formatBytes(data.breakdown.activeBytes)}`}
          />
          <div
            style={{ width: `${wiredPct}%` }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            title={`Wired: ${formatBytes(data.breakdown.wiredBytes)}`}
          />
          <div
            style={{ width: `${compressedPct}%` }}
            className="h-full rounded-r-full bg-gradient-to-r from-violet-400 to-fuchsia-500 transition-all duration-500"
            title={`Compressed: ${formatBytes(data.breakdown.compressedBytes)}`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Active ({activePct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Wired ({wiredPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> Compressed ({compressedPct}%)
          </span>
        </div>
        <p className="mt-3 border-t border-white/8 pt-2.5 text-[11px] leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Tip:</strong> <strong>Active</strong> is memory apps are using right now. <strong>Wired</strong> is locked by macOS. <strong>Compressed</strong> is inactive data squeezed to save RAM. If Pressure is <strong>High</strong> or Swap is growing, check the top apps below and close heavy tabs or unused apps.
        </p>
      </GlassCard>

      {/* Process Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-black/30 p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grouped')}
              className={`no-drag rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30 text-white border border-white/15'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grouped by App ({filteredGroups.length})
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`no-drag rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30 text-white border border-white/15'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Processes ({filteredProcesses.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter app, process, or PID..."
              className="no-drag h-8 w-full rounded-xl border border-white/12 bg-black/25 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {viewMode === 'grouped' ? (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-950/80 text-zinc-400 backdrop-blur-md">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 font-medium">Application</th>
                  <th className="px-4 py-2.5 font-medium">Processes</th>
                  <th className="px-4 py-2.5 font-medium text-right">CPU %</th>
                  <th className="px-4 py-2.5 font-medium text-right">Memory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredGroups.map((group) => {
                  const isExpanded = Boolean(expandedApps[group.appName]);
                  const barWidth = Math.min(
                    100,
                    Math.max(2, (group.totalRssBytes / total) * 100 * 2.5)
                  );
                  return (
                    <React.Fragment key={group.appName}>
                      <tr
                        onClick={() => toggleApp(group.appName)}
                        className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium text-zinc-100">
                          <div className="flex items-center gap-2">
                            {group.processCount > 1 ? (
                              isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                              )
                            ) : (
                              <Cpu className="h-3.5 w-3.5 text-zinc-500" />
                            )}
                            <span>{group.appName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">
                          {group.processCount} {group.processCount === 1 ? 'process' : 'processes'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">
                          {group.totalCpuPercent}%
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <div className="hidden sm:block h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                              <div
                                style={{ width: `${barWidth}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                              />
                            </div>
                            <span className="font-semibold text-cyan-200 min-w-[72px]">
                              {formatBytes(group.totalRssBytes)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        group.processes.map((proc) => (
                          <tr
                            key={proc.pid}
                            className="bg-black/25 text-zinc-400"
                          >
                            <td className="py-1.5 pl-11 pr-4 font-mono text-[11px] text-zinc-300">
                              {proc.name}
                            </td>
                            <td className="px-4 py-1.5 font-mono text-[11px]">
                              PID {proc.pid}
                            </td>
                            <td className="px-4 py-1.5 text-right text-[11px]">
                              {proc.cpuPercent}%
                            </td>
                            <td className="px-4 py-1.5 text-right text-[11px] text-zinc-300">
                              {formatBytes(proc.rssBytes)}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-950/80 text-zinc-400 backdrop-blur-md">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 font-medium">PID</th>
                  <th className="px-4 py-2.5 font-medium">Process</th>
                  <th className="px-4 py-2.5 font-medium">App</th>
                  <th className="px-4 py-2.5 font-medium text-right">CPU %</th>
                  <th className="px-4 py-2.5 font-medium text-right">Memory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredProcesses.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-2 font-mono text-zinc-400">{proc.pid}</td>
                    <td className="px-4 py-2 font-medium text-zinc-100">{proc.name}</td>
                    <td className="px-4 py-2 text-zinc-400">{proc.appName}</td>
                    <td className="px-4 py-2 text-right text-zinc-300">{proc.cpuPercent}%</td>
                    <td className="px-4 py-2 text-right font-semibold text-cyan-200">
                      {formatBytes(proc.rssBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

