import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  title,
  description,
  impactNote,
  pathPreview,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="liquid-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={
                danger
                  ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  : 'flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
              }
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-0.5 text-xs text-zinc-400">Please verify before continuing</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{description}</p>

        {impactNote && (
          <div className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-cyan-100">
            <span className="font-semibold text-cyan-200">What happens: </span>
            {impactNote}
          </div>
        )}

        {pathPreview && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-300 break-all">
            {pathPreview}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

