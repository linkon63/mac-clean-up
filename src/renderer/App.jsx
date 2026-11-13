import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MemoryView } from './components/MemoryView';
import { StorageView } from './components/StorageView';
import { CachesView } from './components/CachesView';

export function App() {
  const [activeTab, setActiveTab] = useState('memory');

  const [memoryData, setMemoryData] = useState(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(2000);

  const [storageData, setStorageData] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  const [cachesData, setCachesData] = useState(null);
  const [cachesLoading, setCachesLoading] = useState(false);

  const fetchMemory = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const res = await window.cleanUpApi.getMemoryDetails();
      setMemoryData(res);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const fetchStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await window.cleanUpApi.getStorageOverview();
      setStorageData(res);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  const fetchCaches = useCallback(async () => {
    setCachesLoading(true);
    try {
      const res = await window.cleanUpApi.getCacheDetails();
      setCachesData(res);
    } finally {
      setCachesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
    fetchStorage();
    fetchCaches();
  }, [fetchMemory, fetchStorage, fetchCaches]);

  useEffect(() => {
    if (!refreshInterval || activeTab !== 'memory') return undefined;
    const id = setInterval(fetchMemory, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, activeTab, fetchMemory]);

  const handleRevealInFinder = async (targetPath) => {
    await window.cleanUpApi.revealInFinder(targetPath);
  };

  const handlePrunePnpm = async () => {
    const res = await window.cleanUpApi.prunePnpmStore();
    await Promise.all([fetchCaches(), fetchStorage()]);
    return res;
  };

  const handleTrashItem = async (targetPath) => {
    const res = await window.cleanUpApi.trashCacheItem(targetPath);
    if (res.ok) {
      await Promise.all([fetchCaches(), fetchStorage()]);
    }
    return res;
  };

  return (
    <div className="liquid-shell flex h-screen w-screen overflow-hidden text-zinc-100">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memorySummary={memoryData}
        storageSummary={storageData}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top draggable titlebar area for macOS */}
        <header className="drag-region flex h-10 shrink-0 items-center justify-end px-6 border-b border-white/6">
          <span className="text-[11px] text-zinc-500">macOS Liquid Inspector</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'memory' && (
            <MemoryView
              data={memoryData}
              loading={memoryLoading}
              refreshInterval={refreshInterval}
              onChangeRefreshInterval={setRefreshInterval}
              onRefresh={fetchMemory}
            />
          )}

          {activeTab === 'storage' && (
            <StorageView
              data={storageData}
              loading={storageLoading}
              onRefresh={fetchStorage}
              onRevealInFinder={handleRevealInFinder}
              onTrashItem={handleTrashItem}
            />
          )}

          {activeTab === 'caches' && (
            <CachesView
              data={cachesData}
              loading={cachesLoading}
              onRefresh={fetchCaches}
              onRevealInFinder={handleRevealInFinder}
              onPrunePnpm={handlePrunePnpm}
              onTrashItem={handleTrashItem}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

