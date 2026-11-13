import React from 'react';
import { Cpu, HardDrive, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import appLogo from '@/assets/logo.png';

const navItems = [
  { id: 'memory', label: 'Memory & Processes', icon: Cpu, hint: 'RAM & top hogs' },
  { id: 'storage', label: 'Storage Overview', icon: HardDrive, hint: 'Disk & folders' },
  { id: 'caches', label: 'Caches & pnpm', icon: Layers, hint: 'Dev & macOS caches' },
];

export function Sidebar({ activeTab, onTabChange, memorySummary, storageSummary }) {
  return (
    <aside className="liquid-sidebar flex w-64 shrink-0 flex-col justify-between p-4 pt-12">
      <div>
        <div className="mb-6 flex items-center gap-3 px-2">
          <img
            src={appLogo}
            alt="Clean-Up Logo"
            className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-cyan-500/25 ring-1 ring-white/15"
          />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">Clean-Up</h1>
            <p className="text-[11px] text-zinc-400">macOS System Inspector</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'no-drag flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-violet-500/20 text-white border border-white/15 shadow-sm'
                    : 'text-zinc-400 hover:bg-white/6 hover:text-zinc-100 border border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active ? 'text-cyan-300' : 'text-zinc-400'
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className="text-[11px] text-zinc-400/90">{item.hint}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Live Snapshot
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">RAM Used</span>
          <span className="font-medium text-cyan-300">
            {memorySummary ? `${memorySummary.usedPercent}%` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Disk Used</span>
          <span className="font-medium text-violet-300">
            {storageSummary ? `${storageSummary.volume.usedPercent}%` : '—'}
          </span>
        </div>
      </div>
    </aside>
  );
}

