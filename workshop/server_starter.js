/**
 * KXR x IEEE — WebSocket Fundamentals Workshop
 * ─────────────────────────────────────────────
 * STARTER FILE  (fill in the blanks as we go)
 *
 * PIPELINE STAGE: [QUERY] → [STREAM]
 *
 * The database query and polling engine are already written for you.
 * Your job today: build the WebSocket layer that sits in between.
 *
 * Run:
 *   npm install
 *   node server_starter.js
 */

'use strict';
const { WebSocketServer, WebSocket } = require('ws');
const { Pool } = require('pg');

process.env.TZ = 'UTC';

// ═════════════════════════════════════════════════════════════════════════════
// [1] DATABASE QUERY  — already done, don't touch
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
// [2] WEBSOCKET MANAGER  — YOU WRITE THIS
// ═════════════════════════════════════════════════════════════════════════════
//
// A WebSocket server works like a chat room.
// You open the room, wait for people to join, then shout messages to everyone.
//
//   Step 1 — Open the room:
//     new WebSocketServer({ port, host })
//
//   Step 2 — React when someone joins:
//     wss.on('connection', (ws) => { ... })
//
//   Step 3 — Shout to everyone in the room:
//     wss.clients.forEach(client => client.send(data))
//     (but only if client.readyState === WebSocket.OPEN)

class WebSocketManager {
  constructor(port) {
    // TODO: Create the WebSocket server and store it as this.wss
    //       Bind it to host '127.0.0.1' on the given port.
    //       Hint: new WebSocketServer({ port, host: '127.0.0.1' })



    console.log(`[WS] Server listening on ws://127.0.0.1:${port}`);
    this._setupListeners();
  }

  _setupListeners() {
    // TODO: Listen for new client connections on this.wss
    //       When a client connects, log how many clients are now connected.
    //       Also attach 'close' and 'error' handlers on the individual socket (ws).
    //
    //       Hint: this.wss.on('connection', (ws) => { ... })



  }

  /** Send a TelemetryPacket to every currently-connected client. */
  broadcast(packet) {
    // TODO: Serialize the packet to a JSON string.
    //       Loop over this.wss.clients and call client.send() on each one
    //       that is currently open.
    //
    //       Hint: JSON.stringify(packet)
    //       Hint: client.readyState === WebSocket.OPEN



  }

  close() {
    this.wss.close(() => console.log('[WS] Server closed'));
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// [3] POLLING ENGINE  — already done, don't touch
// ═════════════════════════════════════════════════════════════════════════════

const TARGET_HZ       = 10;
const TARGET_INTERVAL = 1000 / TARGET_HZ;

class PollingEngine {
  constructor(onData) {
    this.onData        = onData;
    this.isRunning     = false;
    this.timer         = null;
    this.lastTimestamp = 0;
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
      const rows = await queryLatestTelemetry(this.lastTimestamp);

      if (rows.length > 0) {
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

        this.lastTimestamp = rows[rows.length - 1].timestamp;
      } else {
        this.skipped++;
      }
    } catch (err) {
      console.error('[Poll] Query error:', err.message);
    }

    const elapsed   = performance.now() - start;
    const nextDelay = Math.max(0, TARGET_INTERVAL - elapsed);
    this.timer = setTimeout(() => this._tick(), nextDelay);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// [4] STARTUP  — already done, don't touch
// ═════════════════════════════════════════════════════════════════════════════

const WS_PORT = 3001;

async function main() {
  console.log('\n[Main] Starting workshop server...\n');

  const wsManager = new WebSocketManager(WS_PORT);

  const engine = new PollingEngine((packet) => {
    wsManager.broadcast(packet);
  });

  setInterval(() => {
    const { broadcasts, skipped } = engine.getStats();
    console.log(
      `[Heartbeat] broadcasts=${broadcasts}  skipped=${skipped}  ` +
      `clients=${wsManager.wss.clients.size}`
    );
  }, 5000);

  engine.start();

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
