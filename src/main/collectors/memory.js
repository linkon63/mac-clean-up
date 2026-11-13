const os = require('node:os');
const path = require('node:path');
const { runCmd } = require('./exec');

function parseVmStat(output) {
  const pageSizeMatch = output.match(/page size of (\d+) bytes/i);
  const pageSize = pageSizeMatch ? Number.parseInt(pageSizeMatch[1], 10) : 16384;

  const getPages = (label) => {
    const regex = new RegExp(`${label}:\\s+(\\d+)\\.`, 'i');
    const match = output.match(regex);
    return match ? Number.parseInt(match[1], 10) : 0;
  };

  return {
    pageSize,
    free: getPages('Pages free') * pageSize,
    active: getPages('Pages active') * pageSize,
    inactive: getPages('Pages inactive') * pageSize,
    speculative: getPages('Pages speculative') * pageSize,
    wired: getPages('Pages wired down') * pageSize,
    compressed: getPages('Pages occupied by compressor') * pageSize,
    purgeable: getPages('Pages purgeable') * pageSize,
  };
}

function parseSwapUsage(output) {
  if (!output) return { totalBytes: 0, usedBytes: 0, freeBytes: 0 };
  const parseUnit = (val, unit) => {
    const num = Number.parseFloat(val);
    if (Number.isNaN(num)) return 0;
    const u = unit.toUpperCase();
    if (u === 'G') return num * 1024 * 1024 * 1024;
    if (u === 'M') return num * 1024 * 1024;
    if (u === 'K') return num * 1024;
    return num;
  };

  const totalMatch = output.match(/total\s*=\s*([\d.]+)([KMGT]?)/i);
  const usedMatch = output.match(/used\s*=\s*([\d.]+)([KMGT]?)/i);
  const freeMatch = output.match(/free\s*=\s*([\d.]+)([KMGT]?)/i);

  return {
    totalBytes: totalMatch ? parseUnit(totalMatch[1], totalMatch[2]) : 0,
    usedBytes: usedMatch ? parseUnit(usedMatch[1], usedMatch[2]) : 0,
    freeBytes: freeMatch ? parseUnit(freeMatch[1], freeMatch[2]) : 0,
  };
}

function extractAppName(comm) {
  const appMatch = comm.match(/\/([^/]+)\.app\/Contents\//);
  if (appMatch) {
    return appMatch[1];
  }
  return path.basename(comm) || comm;
}

function parseProcesses(psOutput) {
  if (!psOutput) return { processes: [], groupedApps: [] };

  const lines = psOutput.trim().split('\n').slice(1);
  const processes = [];
  const groups = new Map();

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (!match) continue;

    const pid = Number.parseInt(match[1], 10);
    const ppid = Number.parseInt(match[2], 10);
    const rssKb = Number.parseInt(match[3], 10);
    const cpuPercent = Number.parseFloat(match[4]);
    const memPercent = Number.parseFloat(match[5]);
    const comm = match[6].trim();

    if (rssKb <= 0) continue;

    const rssBytes = rssKb * 1024;
    const appName = extractAppName(comm);
    const procName = path.basename(comm) || comm;

    const proc = {
      pid,
      ppid,
      name: procName,
      appName,
      command: comm,
      rssBytes,
      cpuPercent,
      memPercent,
    };

    processes.push(proc);

    if (!groups.has(appName)) {
      groups.set(appName, {
        appName,
        totalRssBytes: 0,
        totalCpuPercent: 0,
        totalMemPercent: 0,
        processCount: 0,
        processes: [],
      });
    }

    const group = groups.get(appName);
    group.totalRssBytes += rssBytes;
    group.totalCpuPercent += cpuPercent;
    group.totalMemPercent += memPercent;
    group.processCount += 1;
    group.processes.push(proc);
  }

  processes.sort((a, b) => b.rssBytes - a.rssBytes);

  const groupedApps = Array.from(groups.values())
    .map((g) => ({
      ...g,
      totalCpuPercent: Number(g.totalCpuPercent.toFixed(1)),
      totalMemPercent: Number(g.totalMemPercent.toFixed(1)),
      processes: g.processes.sort((a, b) => b.rssBytes - a.rssBytes),
    }))
    .sort((a, b) => b.totalRssBytes - a.totalRssBytes);

  return {
    processes: processes.slice(0, 150),
    groupedApps: groupedApps.slice(0, 80),
  };
}

async function getMemoryDetails() {
  const [memSizeOut, vmStatOut, swapOut, psOut] = await Promise.all([
    runCmd('sysctl', ['-n', 'hw.memsize']),
    runCmd('vm_stat'),
    runCmd('sysctl', ['vm.swapusage']),
    runCmd('ps', ['-axo', 'pid,ppid,rss,%cpu,%mem,comm']),
  ]);

  const totalBytes = memSizeOut ? Number.parseInt(memSizeOut.trim(), 10) : os.totalmem();
  const vm = vmStatOut ? parseVmStat(vmStatOut) : null;
  const swap = parseSwapUsage(swapOut);

  const activeBytes = vm ? vm.active : 0;
  const wiredBytes = vm ? vm.wired : 0;
  const compressedBytes = vm ? vm.compressed : 0;
  const inactiveBytes = vm ? vm.inactive + vm.speculative : 0;
  const purgeableBytes = vm ? vm.purgeable : 0;

  // Activity Monitor defines Memory Used as App Memory (approx Active) + Wired + Compressed
  const usedBytes = vm
    ? Math.min(totalBytes, activeBytes + wiredBytes + compressedBytes)
    : totalBytes - os.freemem();
  const freeBytes = Math.max(0, totalBytes - usedBytes);
  const usedPercent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

  let pressure = 'Normal';
  if (usedPercent >= 85 || swap.usedBytes > 4 * 1024 * 1024 * 1024) {
    pressure = 'High';
  } else if (usedPercent >= 68) {
    pressure = 'Moderate';
  }

  const { processes, groupedApps } = parseProcesses(psOut);

  return {
    timestamp: Date.now(),
    totalBytes,
    usedBytes,
    freeBytes,
    usedPercent,
    pressure,
    breakdown: {
      activeBytes,
      wiredBytes,
      compressedBytes,
      inactiveBytes,
      purgeableBytes,
    },
    swap,
    processCount: processes.length,
    groupedApps,
    processes,
  };
}

module.exports = {
  getMemoryDetails,
};

