// Presence Service Configuration
module.exports = {
  // How often to scan the network (in milliseconds)
  SCAN_INTERVAL_MS: parseInt(process.env.SCAN_INTERVAL_MS) || 10000,

  // Express REST API port
  REST_PORT: parseInt(process.env.REST_PORT) || 3001,

  // WebSocket server port
  WS_PORT: parseInt(process.env.WS_PORT) || 3002,

  // Network interface to scan (leave empty for default)
  NETWORK_INTERFACE: process.env.NETWORK_INTERFACE || '',

  // Backend service URL (for future health checks)
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8080',

  // Access point the demo simulator reports for in-room devices.
  // Must match the BSSID registered for the classroom in the backend.
  DEMO_ROOM_BSSID: process.env.DEMO_ROOM_BSSID || 'A4:83:E7:C0:FF:EE',

  // A neighbouring access point, used to show out-of-room devices being refused.
  DEMO_CORRIDOR_BSSID: process.env.DEMO_CORRIDOR_BSSID || 'A4:83:E7:11:22:33',
};
