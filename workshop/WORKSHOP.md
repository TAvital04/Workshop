# KXR × IEEE — WebSocket Fundamentals Workshop

```
[INGESTION]  →  [STORAGE]  →  [QUERY]  →  [STREAM]  →  [DISPLAY]
  Blackbox        Glance       Explain      Explain      Build
  (Pi/ADC)       (QuestDB)     (SQL)       (Socket)    (Client)
```

**Duration:** 60–90 minutes

---

## Audience

UCF engineering students (KXR / IEEE members). No prior networking or backend experience required — basic programming literacy is enough.

---

## Prerequisites

**Knowledge:** Basic JavaScript (variables, functions, callbacks), what a URL is

**Software — install before arriving:**

| Tool | Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| Python | 3.9+ | `python3 --version` |
| Chrome / Firefox | any | — |

**Setup (run once in `workshop/`):**
```bash
# Python
python3 -m venv venv && source venv/bin/activate
pip install psycopg2-binary questdb

# Node
npm install
```

> You do **not** need to install QuestDB — the presenter's Pi runs it and shares it over the local router.

---

## Bill of Materials (BOM)

> Presenter-owned hardware. Attendees only need a laptop.

| Item | Qty |
|---|---|
| Raspberry Pi | 1 |
| Custom PCB with ADS1256 ADC | 1 |
| Load cell | 1 |
| WiFi router | 1 |

---

## Agenda

| # | Segment | Time |
|---|---|---|
| 1 | What is Streaming | 5 min |
| 2 | UDP vs TCP | 8 min |
| 3 | HTTP vs WebSockets | 8 min |
| 4 | How HTTP Works | 7 min |
| 5 | WebSockets | 10 min |
| 6 | Code Tour + Lab | 30–40 min |
| — | Q&A | 5 min |

---

## Slides

---

### Slide 1 — What is Streaming?

- Data that flows continuously vs data fetched on demand
- Traditional model: you ask, the server answers, done
- Streaming: server sends data whenever it has something new
- Examples: stock tickers, live scores, video, rocket telemetry

---

### Slide 2 — UDP vs TCP

- Both are transport protocols — define how bytes move between machines over IP
- **UDP:** no connection, no guaranteed delivery, very fast — used in gaming, video calls, DNS
- **TCP:** connection-oriented, guaranteed + ordered delivery — used in web, email, file transfers
- WebSockets are built on TCP

---

### Slide 3 — HTTP vs WebSockets

- Two main options for streaming real-time data in a browser
- **HTTP polling:** client asks repeatedly, server replies each time, connection closes each time
- **WebSocket:** one handshake to open, connection stays alive, server pushes data as frames
- HTTP carries ~500 bytes of headers per request; WebSocket frames carry ~2 bytes of overhead
- WebSocket is far more efficient for high-frequency data

---

### Slide 4 — How HTTP Works

- Client opens a TCP connection, sends a request with headers, server replies, connection closes
- Stateless — the server remembers nothing between requests
- To get live data you have to poll: send a request over and over
- Most polls return stale data — wasted bandwidth and latency
- Great for loading pages and APIs; poor fit for anything faster than ~1 Hz

---

### Slide 5 — WebSockets

- Starts as a normal HTTP request with an `Upgrade: websocket` header
- Server responds `101 Switching Protocols` — handshake done, HTTP is over
- The TCP connection stays open as a bidirectional frame pipe
- Either side can send at any time — no request needed
- Browser API: four event handlers — `onopen`, `onmessage`, `onclose`, `onerror`
- No external library required — built into every modern browser

---

### Slide 6 — Code Walkthrough + Lab

**Tour (presenter walks through the complete files):**
- Pipeline: QuestDB stores sensor data → `server.js` queries and streams it → `index.html` displays it
- `server.js`: SQL query, polling engine at 10 Hz, WebSocket manager that broadcasts to all clients
- `index.html`: four event handlers wired to pre-built rendering helpers (card, canvas chart, status badge)

**Lab (attendees work in both starter files):**
- `server_starter.js` — 3 TODOs: create the WebSocket server, wire connection/close/error events, implement `broadcast`
- `index_starter.html` — 5 TODOs: create the WebSocket, wire `onopen`, `onmessage`, `onclose`, `onerror`
- Goal: LC1 card appears and updates live at 10 Hz from the Pi's load cell

**Files:**

| File | Role |
|---|---|
| `server_starter.js` | Server skeleton — WebSocket layer left blank |
| `index_starter.html` | Client skeleton — 5 TODOs to fill in |
| `server.js` / `index.html` | Complete reference solution |

---

## Workshop Day Setup

1. Presenter announces the Pi's IP address
2. Attendees update `host` in `server_starter.js` to the Pi's IP
3. `node server_starter.js` — verify `[WS] Server listening on ws://127.0.0.1:3001`
4. Open `index_starter.html` in browser and fill in the 5 TODOs
