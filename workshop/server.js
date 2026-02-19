/**
 * KXR x IEEE — WebSocket Fundamentals Workshop
 * ─────────────────────────────────────────────
 * PIPELINE STAGE: [QUERY] → [STREAM]
 *
 * Mirrors the structure of the real KXR backend:
 *   index.ts              → startup + wiring     (bottom of this file)
 *   services/socketServer.ts    → WebSocketManager class
 *   services/pollingEngine.ts   → PollingEngine class
 *   db/client.ts          → queryLatestTelemetry()  (top of this file)
 *
 * The INGESTION side (Pi → ADC → QuestDB) is handled separately.
 * This file only does: query DB → build packet → broadcast over WebSocket.
 *
 * Run:
 *   npm install
 *   node server.js
 */

'use strict';
const { WebSocketServer, WebSocket } = require('ws');
const { Pool } = require('pg');

process.env.TZ = 'UTC';

// ═════════════════════════════════════════════════════════════════════════════
// [1] DATABASE QUERY
// ═════════════════════════════════════════════════════════════════════════════

const pool = new Pool({
  host: '127.0.0.1',
  port: 8812,
  user: 'admin',
  password: 'quest',
  database: 'qdb',
  max: 2,   // 1 active query + 1 for churn — 20 clients × 2 = 40 total connections to Pi
  idleTimeoutMillis: 30000,
});

/**
 * Fetches all rows from workshop_example newer than lastTimestamp.
 * Returns an array of row objects, or an empty array if nothing is new.
 *
 * Each row shape: { timestamp, pt1..pt9, lc1 }
 */
async function queryLatestTelemetry(lastTimestamp) {
  const query = lastTimestamp
    ? 'SELECT * FROM workshop_example WHERE timestamp > $1 ORDER BY timestamp ASC'
    : 'SELECT * FROM workshop_example ORDER BY timestamp ASC';

  const params = lastTimestamp ? [lastTimestamp] : [];
  const result = await pool.query(query, params);
  return result.rows;
}


// ═════════════════════════════════════════════════════════════════════════════
// [2] WEBSOCKET MANAGER
// ═════════════════════════════════════════════════════════════════════════════

class WebSocketManager {
  constructor(port) {
    // Create the WebSocket server bound to localhost
    this.wss = new WebSocketServer({ port, host: '127.0.0.1' });
    console.log(`[WS] Server listening on ws://127.0.0.1:${port}`);
    this._setupListeners();
  }

  _setupListeners() {
    // Fires once per new browser tab / client that connects
    this.wss.on('connection', (ws) => {
      console.log(`[WS] Client connected  (total: ${this.wss.clients.size})`);

      ws.on('close', () => {
        console.log(`[WS] Client disconnected (total: ${this.wss.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Socket error:', err.message);
      });
    });

    this.wss.on('error', (err) => {
      console.error('[WS] Server error:', err.message);
    });
  }

  /** Send a TelemetryPacket to every currently-connected client. */
  broadcast(packet) {
    const payload = JSON.stringify(packet);

    this.wss.clients.forEach((client) => {
      // Only send to clients whose connection is fully open
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  close() {
    this.wss.close(() => console.log('[WS] Server closed'));
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// [3] POLLING ENGINE
// ═════════════════════════════════════════════════════════════════════════════

const TARGET_HZ       = 10;
const TARGET_INTERVAL = 1000 / TARGET_HZ;   // ms between polls

class PollingEngine {
  constructor(onData) {
    this.onData        = onData;  // callback → WebSocketManager.broadcast
    this.isRunning     = false;
    this.timer         = null;
    this.lastTimestamp = 0;       // deduplication: skip if same row
    this.broadcasts    = 0;
    this.skipped       = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Poll] Engine started at ${TARGET_HZ} Hz`);
    this._tick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
  }

  getStats() {
    return { broadcasts: this.broadcasts, skipped: this.skipped };
  }

  async _tick() {
    if (!this.isRunning) return;

    const start = performance.now();

    try {
      // 1. Query — only fetch rows newer than the last one we saw
      const rows = await queryLatestTelemetry(this.lastTimestamp);

      if (rows.length > 0) {
        // 2. Build and broadcast a packet for each new row
        rows.forEach((row) => {
          const packet = {
            timestamp: row.timestamp,
            telemetry: [
              { id: 'pt1', value: row.pt1 },
              { id: 'pt2', value: row.pt2 },
              { id: 'pt3', value: row.pt3 },
              { id: 'pt4', value: row.pt4 },
              { id: 'pt5', value: row.pt5 },
              { id: 'pt6', value: row.pt6 },
              { id: 'pt7', value: row.pt7 },
              { id: 'pt8', value: row.pt8 },
              { id: 'pt9', value: row.pt9 },
              { id: 'lc1', value: row.lc1 },
            ],
          };
          this.onData(packet);
          this.broadcasts++;
        });

        // 3. Advance the timestamp cursor to the last row received
        this.lastTimestamp = rows[rows.length - 1].timestamp;
      } else {
        this.skipped++;
      }
    } catch (err) {
      console.error('[Poll] Query error:', err.message);
    }

    // 4. Self-correcting timer — accounts for query time so we stay on target
    const elapsed   = performance.now() - start;
    const nextDelay = Math.max(0, TARGET_INTERVAL - elapsed);
    this.timer = setTimeout(() => this._tick(), nextDelay);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// [4] STARTUP
// ═════════════════════════════════════════════════════════════════════════════

const WS_PORT = 3001;

async function main() {
  console.log('\n[Main] Starting workshop server...\n');

  // 1. Start WebSocket server
  const wsManager = new WebSocketManager(WS_PORT);

  // 2. Start polling engine — wires query output to WS broadcast
  const engine = new PollingEngine((packet) => {
    wsManager.broadcast(packet);
  });

  // 3. Heartbeat log every 5 seconds
  setInterval(() => {
    const { broadcasts, skipped } = engine.getStats();
    console.log(
      `[Heartbeat] broadcasts=${broadcasts}  skipped=${skipped}  ` +
      `clients=${wsManager.wss.clients.size}`
    );
  }, 5000);

  // 4. Run
  engine.start();

  // 5. Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Main] Shutting down...');
    engine.stop();
    wsManager.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
}

main();
