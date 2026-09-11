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
};
