/**
 * Smart Attendance — Presence Service
 * 
 * Entry point. Starts:
 * 1. Network scanner (polling loop)
 * 2. WebSocket server (pushes presence events to backend)
 * 3. Express REST server (fallback endpoint for polling)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { scanNetwork, detectDisconnected } = require('./scanner');
const { getLocalWireless, getStationSignals } = require('./wireless');
const config = require('./config');

// ─── State ──────────────────────────────────────────────────────────────────────
let currentDevices = [];
let previousDevices = [];
let scanCount = 0;
let wirelessContext = { bssid: null, ssid: null, rssi: null, source: 'startup' };

// ─── WebSocket Server ───────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: config.WS_PORT });
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  wsClients.add(ws);

  // Send current state on connect
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      devices: currentDevices,
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('[WS] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
    wsClients.delete(ws);
  });
});

/**
 * Broadcast a message to all connected WebSocket clients.
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  }
}

// ─── Scanner Polling Loop ───────────────────────────────────────────────────────
async function runScanCycle() {
  try {
    const [devices, localWireless, stationSignals] = await Promise.all([
      scanNetwork(),
      getLocalWireless(),
      getStationSignals(),
    ]);

    wirelessContext = localWireless;

    // Tag every ARP entry with the room's access point, and with per-client
    // signal strength when this host is the AP and can report it.
    const enriched = devices.map((d) => ({
      ...d,
      bssid: localWireless.bssid || null,
      rssi: stationSignals.has(d.mac) ? stationSignals.get(d.mac) : null,
    }));

    const simulated = currentDevices.filter((d) => d.simulated);
    previousDevices = currentDevices;
    currentDevices = [...enriched, ...simulated];
    scanCount++;

    // Detect new connections
    const previousMacs = new Set(previousDevices.map((d) => d.mac));
    const newlyConnected = enriched.filter((d) => !previousMacs.has(d.mac));

    // Detect disconnections
    const disconnected = detectDisconnected(previousDevices, enriched);

    // Broadcast events for newly connected devices
    for (const device of newlyConnected) {
      const event = {
        type: 'presence_event',
        mac: device.mac,
        ip: device.ip,
        bssid: device.bssid,
        rssi: device.rssi,
        status: 'connected',
        timestamp: device.timestamp,
      };
      broadcast(event);
      console.log(
        `[Event] CONNECTED: ${device.mac} (${device.ip})` +
          `${device.bssid ? ` via AP ${device.bssid}` : ''}` +
          `${device.rssi != null ? ` @ ${device.rssi} dBm` : ''}`
      );
    }

    // Broadcast events for disconnected devices
    for (const device of disconnected) {
      const event = {
        type: 'presence_event',
        mac: device.mac,
        ip: device.ip,
        status: 'disconnected',
        timestamp: device.timestamp,
      };
      broadcast(event);
      console.log(`[Event] DISCONNECTED: ${device.mac} (${device.ip})`);
    }

    // Periodically broadcast full snapshot
    if (scanCount % 6 === 0) {
      broadcast({
        type: 'snapshot',
        devices: currentDevices,
        bssid: localWireless.bssid || null,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Scanner] Scan cycle error:', err.message);
  }
}

// Start the polling loop
console.log(
  `[Scanner] Starting scan loop (interval: ${config.SCAN_INTERVAL_MS}ms)`
);
runScanCycle(); // Initial scan
const scanInterval = setInterval(runScanCycle, config.SCAN_INTERVAL_MS);

// ─── Express REST Server ────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /presence/current
 * Returns the current list of connected devices.
 */
app.get('/presence/current', (req, res) => {
  res.json({
    success: true,
    count: currentDevices.length,
    devices: currentDevices,
    wireless: wirelessContext,
    lastScan: currentDevices.length > 0 ? currentDevices[0].timestamp : null,
    scanCount,
  });
});

/**
 * GET /presence/health
 * Health check endpoint.
 */
app.get('/presence/health', (req, res) => {
  res.json({
    success: true,
    service: 'presence-service',
    status: 'running',
    wsClients: wsClients.size,
    scanCount,
    uptime: process.uptime(),
    simulated: currentDevices.filter((d) => d.simulated).length,
    bssid: wirelessContext.bssid,
    wirelessSource: wirelessContext.source,
  });
});

/**
 * GET /presence/wireless
 * Which access point this scanner sees, and how it found out.
 */
app.get('/presence/wireless', (req, res) => {
  res.json({ success: true, wireless: wirelessContext });
});

/**
 * POST /presence/simulate
 * Injects demo classroom devices (AA:BB:CC:11:22:XX) as ARP events.
 *
 * The last `outsideCount` devices are placed on a neighbouring access point
 * with a weak signal, so the demo shows the backend refusing to mark students
 * who are on campus Wi-Fi but not actually in the room.
 */
app.post('/presence/simulate', (req, res) => {
  const count = Math.min(12, Math.max(1, Number(req.body?.count) || 10));
  const intervalMs = Math.min(5000, Math.max(400, Number(req.body?.intervalMs) || 1500));
  const outsideCount = Math.min(count, Math.max(0, Number(req.body?.outsideCount) ?? 2));
  const inRoomCount = count - outsideCount;

  const roster = [];
  for (let i = 1; i <= count; i++) {
    const outside = i > inRoomCount;
    roster.push({
      mac: `AA:BB:CC:11:22:${i.toString(16).padStart(2, '0').toUpperCase()}`,
      ip: `192.168.1.${100 + i}`,
      type: 'dynamic',
      status: 'connected',
      simulated: true,
      outside,
      bssid: outside ? config.DEMO_CORRIDOR_BSSID : config.DEMO_ROOM_BSSID,
      // Strong signals inside the room, weak ones out in the corridor.
      rssi: outside ? -78 - ((i * 3) % 8) : -42 - ((i * 5) % 20),
      timestamp: new Date().toISOString(),
    });
  }

  let delay = 0;
  roster.forEach((device, index) => {
    setTimeout(() => {
      const exists = currentDevices.some((d) => d.mac === device.mac);
      if (!exists) {
        currentDevices.push(device);
      }
      broadcast({
        type: 'presence_event',
        mac: device.mac,
        ip: device.ip,
        bssid: device.bssid,
        rssi: device.rssi,
        status: 'connected',
        simulated: true,
        timestamp: new Date().toISOString(),
      });
      console.log(
        `[Demo] CONNECTED ${index + 1}/${count}: ${device.mac} (${device.ip})` +
          ` via AP ${device.bssid} @ ${device.rssi} dBm` +
          `${device.outside ? ' [outside the room]' : ''}`
      );
    }, delay);
    delay += intervalMs;
  });

  res.json({
    success: true,
    message: `Simulating ${inRoomCount} in-room and ${outsideCount} out-of-room devices`,
    count,
    inRoomCount,
    outsideCount,
    intervalMs,
    roomBssid: config.DEMO_ROOM_BSSID,
    corridorBssid: config.DEMO_CORRIDOR_BSSID,
    devices: roster,
  });
});

app.post('/presence/simulate/clear', (req, res) => {
  currentDevices = currentDevices.filter((d) => !d.simulated);
  res.json({ success: true, message: 'Simulated devices cleared' });
});

app.listen(config.REST_PORT, () => {
  console.log(`[REST] Presence REST API running on port ${config.REST_PORT}`);
  console.log(`[WS]   WebSocket server running on port ${config.WS_PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  http://localhost:${config.REST_PORT}/presence/current`);
  console.log(`  GET  http://localhost:${config.REST_PORT}/presence/health`);
  console.log(`  WS   ws://localhost:${config.WS_PORT}`);
  console.log('');
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Stopping presence service...');
  clearInterval(scanInterval);
  wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(scanInterval);
  wss.close();
  process.exit(0);
});
