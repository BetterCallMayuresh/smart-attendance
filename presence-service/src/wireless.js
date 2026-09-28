/**
 * Wireless Context Module
 *
 * Answers two questions the ARP table cannot:
 *   1. Which access point is serving this room? (BSSID)
 *   2. How strong is each client's signal? (RSSI in dBm)
 *
 * Three sources, in order of fidelity:
 *   - AP mode:       `iw dev <iface> station dump` gives per-client RSSI. Best.
 *   - Observer mode: the scanner reports the AP it is associated with, which is
 *                    the room's AP. Per-client RSSI is unavailable.
 *   - Override:      CLASSROOM_BSSID env var, for demos and locked-down laptops.
 */

const { exec } = require('child_process');
const os = require('os');

function run(command, timeoutMs = 4000) {
  return new Promise((resolve) => {
    exec(command, { timeout: timeoutMs }, (error, stdout) => {
      resolve(error ? '' : stdout);
    });
  });
}

function normalizeMac(mac) {
  return String(mac || '').trim().toUpperCase().replace(/-/g, ':');
}

/** macOS: newer releases removed `airport`, so try wdutil then fall back. */
async function macosWireless() {
  const wdutil = await run('wdutil info 2>/dev/null');
  if (wdutil) {
    const bssid = wdutil.match(/BSSID\s*:\s*([0-9a-fA-F:]{17})/);
    const ssid = wdutil.match(/SSID\s*:\s*(.+)/);
    const rssi = wdutil.match(/RSSI\s*:\s*(-?\d+)/);
    if (bssid) {
      return {
        bssid: normalizeMac(bssid[1]),
        ssid: ssid ? ssid[1].trim() : null,
        rssi: rssi ? parseInt(rssi[1], 10) : null,
        source: 'wdutil',
      };
    }
  }

  const airport = await run(
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null'
  );
  if (airport) {
    const bssid = airport.match(/\bBSSID:\s*([0-9a-fA-F:]{17})/);
    const ssid = airport.match(/\bSSID:\s*(.+)/);
    const rssi = airport.match(/agrCtlRSSI:\s*(-?\d+)/);
    if (bssid) {
      return {
        bssid: normalizeMac(bssid[1]),
        ssid: ssid ? ssid[1].trim() : null,
        rssi: rssi ? parseInt(rssi[1], 10) : null,
        source: 'airport',
      };
    }
  }

  return null;
}

/** Linux: `iw dev <iface> link` when associated as a client. */
async function linuxWireless() {
  const dev = await run('iw dev 2>/dev/null');
  const ifaceMatch = dev.match(/Interface\s+(\S+)/);
  const iface = ifaceMatch ? ifaceMatch[1] : 'wlan0';

  const link = await run(`iw dev ${iface} link 2>/dev/null`);
  if (link && !/Not connected/i.test(link)) {
    const bssid = link.match(/Connected to\s+([0-9a-fA-F:]{17})/);
    const ssid = link.match(/SSID:\s*(.+)/);
    const rssi = link.match(/signal:\s*(-?\d+)\s*dBm/);
    if (bssid) {
      return {
        bssid: normalizeMac(bssid[1]),
        ssid: ssid ? ssid[1].trim() : null,
        rssi: rssi ? parseInt(rssi[1], 10) : null,
        source: 'iw-link',
        iface,
      };
    }
  }
  return { bssid: null, ssid: null, rssi: null, source: 'none', iface };
}

/** Windows: `netsh wlan show interfaces` reports signal as a percentage. */
async function windowsWireless() {
  const out = await run('netsh wlan show interfaces');
  if (!out) return null;
  const bssid = out.match(/BSSID\s*:\s*([0-9a-fA-F:]{17})/);
  const ssid = out.match(/^\s*SSID\s*:\s*(.+)$/m);
  const signal = out.match(/Signal\s*:\s*(\d+)%/);
  if (!bssid) return null;
  return {
    bssid: normalizeMac(bssid[1]),
    ssid: ssid ? ssid[1].trim() : null,
    // Windows exposes a quality percentage; map it back to an approximate dBm.
    rssi: signal ? Math.round(parseInt(signal[1], 10) / 2 - 100) : null,
    source: 'netsh',
  };
}

/**
 * The access point serving this room, plus the scanner's own signal.
 */
async function getLocalWireless() {
  if (process.env.CLASSROOM_BSSID) {
    return {
      bssid: normalizeMac(process.env.CLASSROOM_BSSID),
      ssid: process.env.CLASSROOM_SSID || null,
      rssi: null,
      source: 'env-override',
    };
  }

  const platform = os.platform();
  let result = null;
  if (platform === 'darwin') {
    result = await macosWireless();
  } else if (platform === 'linux') {
    result = await linuxWireless();
  } else if (platform === 'win32') {
    result = await windowsWireless();
  }

  return result || { bssid: null, ssid: null, rssi: null, source: 'unavailable' };
}

/**
 * Per-client signal strengths, available only when this host is the AP.
 * @returns {Promise<Map<string, number>>} MAC (uppercase) to RSSI in dBm
 */
async function getStationSignals() {
  if (os.platform() !== 'linux') {
    return new Map();
  }

  const dev = await run('iw dev 2>/dev/null');
  const ifaceMatch = dev.match(/Interface\s+(\S+)/);
  const iface = ifaceMatch ? ifaceMatch[1] : 'wlan0';

  const dump = await run(`iw dev ${iface} station dump 2>/dev/null`);
  const signals = new Map();
  if (!dump) return signals;

  let currentMac = null;
  for (const line of dump.split('\n')) {
    const station = line.match(/Station\s+([0-9a-fA-F:]{17})/);
    if (station) {
      currentMac = normalizeMac(station[1]);
      continue;
    }
    const signal = line.match(/signal:\s*(-?\d+)/);
    if (signal && currentMac) {
      signals.set(currentMac, parseInt(signal[1], 10));
      currentMac = null;
    }
  }
  return signals;
}

module.exports = {
  getLocalWireless,
  getStationSignals,
  normalizeMac,
};
