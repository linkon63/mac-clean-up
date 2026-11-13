# mac-clean-up

A macOS desktop application built with Electron, Vite, React, and Tailwind CSS for inspecting system memory, top memory-consuming processes, disk storage, `node_modules`, global `npm` packages, `pnpm` store, and macOS/developer caches.

## Features
- **Memory & Top Consumers**: Real-time macOS RAM breakdown (Active, Wired, Compressed, Inactive, Swap) and processes grouped by application.
- **Full Storage & Module Inspector**: Drill-down folder explorer, unused & heavy `node_modules` tracker, and global `npm` packages inspector.
- **Caches & pnpm Details**: Detailed `pnpm` store/cache inspection (`pnpm store prune`), developer caches, and `~/Library/Caches` with built-in safety instructions, Reveal in Finder, and reversible Move to Trash.

## Development & Packaging
```bash
pnpm install
pnpm dev      # Run in development mode
pnpm dist     # Build macOS .app and .dmg in release/
```

