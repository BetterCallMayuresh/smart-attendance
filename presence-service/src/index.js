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
const config = require('./config');

// ─── State ──────────────────────────────────────────────────────────────────────
let currentDevices = [];
let previousDevices = [];
let scanCount = 0;

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
    const devices = await scanNetwork();
    previousDevices = currentDevices;
    currentDevices = devices;
    scanCount++;

    // Detect new connections
    const previousMacs = new Set(previousDevices.map((d) => d.mac));
    const newlyConnected = devices.filter((d) => !previousMacs.has(d.mac));

    // Detect disconnections
    const disconnected = detectDisconnected(previousDevices, devices);

    // Broadcast events for newly connected devices
    for (const device of newlyConnected) {
      const event = {
        type: 'presence_event',
        mac: device.mac,
        ip: device.ip,
        status: 'connected',
        timestamp: device.timestamp,
      };
      broadcast(event);
      console.log(`[Event] CONNECTED: ${device.mac} (${device.ip})`);
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
  });
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
