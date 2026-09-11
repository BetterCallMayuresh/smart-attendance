/**
 * Network Scanner Module
 * 
 * Scans the local network for connected devices using the system's ARP table.
 * On Windows, uses `arp -a` command. On Linux/Mac, uses `arp -a` as well (compatible).
 * 
 * Returns a list of { mac, ip, status, timestamp } objects.
 */

const { exec } = require('child_process');
const os = require('os');

/**
 * Parse the output of `arp -a` on Windows.
 * Windows format:
 *   Interface: 192.168.1.5 --- 0x6
 *     Internet Address      Physical Address      Type
 *     192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic
 */
function parseArpWindows(output) {
  const devices = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines like: 192.168.1.1    aa-bb-cc-dd-ee-ff    dynamic
    const match = trimmed.match(
      /^(\d+\.\d+\.\d+\.\d+)\s+([\da-fA-F]{2}[:-][\da-fA-F]{2}[:-][\da-fA-F]{2}[:-][\da-fA-F]{2}[:-][\da-fA-F]{2}[:-][\da-fA-F]{2})\s+(\w+)/
    );
    if (match) {
      const ip = match[1];
      // Normalize MAC: replace hyphens with colons and uppercase
      const mac = match[2].replace(/-/g, ':').toUpperCase();
      const type = match[3];

      // Skip broadcast and multicast addresses
      if (mac === 'FF:FF:FF:FF:FF:FF') continue;
      if (ip.endsWith('.255')) continue;

      devices.push({
        mac,
        ip,
        type,
        status: 'connected',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return devices;
}

/**
 * Parse the output of `arp -a` on Linux/macOS.
 * Linux/Mac format:
 *   ? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0
 */
function parseArpUnix(output) {
  const devices = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(
      /\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2}:[\da-fA-F]{2})/
    );
    if (match) {
      const ip = match[1];
      const mac = match[2].toUpperCase();

      if (mac === 'FF:FF:FF:FF:FF:FF') continue;
      if (ip.endsWith('.255')) continue;

      devices.push({
        mac,
        ip,
        type: 'dynamic',
        status: 'connected',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return devices;
}

/**
 * Scan the local network ARP table and return connected devices.
 * @returns {Promise<Array<{mac: string, ip: string, status: string, timestamp: string}>>}
 */
function scanNetwork() {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    const command = 'arp -a';

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Scanner] Error executing arp: ${error.message}`);
        reject(error);
        return;
      }

      const devices = isWindows
        ? parseArpWindows(stdout)
        : parseArpUnix(stdout);

      console.log(
        `[Scanner] Scan complete: found ${devices.length} device(s) at ${new Date().toISOString()}`
      );
      resolve(devices);
    });
  });
}

/**
 * Detect devices that have left the network by comparing current and previous scans.
 * 
 * @param {Array} previousDevices - Devices from the previous scan
 * @param {Array} currentDevices - Devices from the current scan
 * @returns {Array} Devices that were present before but are now gone
 */
function detectDisconnected(previousDevices, currentDevices) {
  const currentMacs = new Set(currentDevices.map((d) => d.mac));
  return previousDevices
    .filter((d) => !currentMacs.has(d.mac))
    .map((d) => ({
      ...d,
      status: 'disconnected',
      timestamp: new Date().toISOString(),
    }));
}

module.exports = {
  scanNetwork,
  detectDisconnected,
};
