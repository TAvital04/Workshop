# KXR x IEEE — WebSocket Fundamentals Workshop

```
[INGESTION]  →  [STORAGE]  →  [QUERY]  →  [STREAM]  →  [DISPLAY]
  ingest_test.py  QuestDB    server.js   server.js    index.html
```

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| Python | 3.9+ | `python3 --version` |
| QuestDB | any | running on port 9000 / 8812 |

**Python packages**
```bash
cd workshop
python3 -m venv venv
source venv/bin/activate
pip install psycopg2-binary questdb
```

> Next time you open a terminal, run `source venv/bin/activate` before running any Python scripts.

**Node packages** (from this folder)
```bash
npm install
```

---

## Running locally (QuestDB on your machine)

### 1. Start QuestDB
Download from [questdb.io](https://questdb.io) if not installed.
```bash
# macOS — if installed via the .tar.gz binary
questdb start   # start
questdb stop    # stop
questdb status  # check if running

# or run the jar directly
java -jar questdb.jar start
java -jar questdb.jar stop
```
QuestDB web console → http://localhost:9000
Postgres wire (what the server connects to) → port 8812

---

### 2. Create the table

Run this once in the QuestDB web console (http://localhost:9000):
```sql
CREATE TABLE workshop_example (
    timestamp TIMESTAMP,
    lc1       DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

To wipe and start fresh:
```sql
TRUNCATE TABLE workshop_example;
```

---

### 3. Ingest test data

In a terminal, from the `workshop/` folder:
```bash
python ingest_test.py              # runs forever, Ctrl+C to stop
python ingest_test.py --duration 60  # runs for 60 seconds
```

This creates the `workshop_example` table (truncates if it already exists)
and streams simulated `lc1` load-cell values at 10 Hz.

---

### 4. Start the WebSocket server

In a second terminal, from the `workshop/` folder:

> **Local testing:** make sure `server.js` has `host: '127.0.0.1'` in the Pool config.
> For the workshop day, replace it with the Pi's IP.

```bash
node server.js
```

You should see:
```
[Main] Starting workshop server...
[WS] Server listening on ws://127.0.0.1:3001
[Poll] Engine started at 10 Hz
```

---

### 5. Open the dashboard

Open `index.html` directly in a browser (no server needed):
```
File → Open → workshop/index.html
```

The `lc1` card should appear and update live.

---

## Workshop day setup (Pi as QuestDB server)

1. Update `host` in both `server.js` and `server_starter.js`:
   ```js
   host: '192.168.X.XXX',  // Pi's IP — run `hostname -I` on the Pi
   ```
2. Each attendee runs `node server_starter.js` on their own laptop
3. Everyone opens `index.html` in their browser

---

## Files

| File | Purpose |
|---|---|
| `server.js` | Complete solution — reference / presenter copy |
| `server_starter.js` | Skeleton — attendees fill in the WebSocket server blanks |
| `index.html` | Complete frontend — reference / presenter copy |
| `index_starter.html` | Skeleton — attendees fill in the WebSocket client blanks |
| `ingest_test.py` | Streams fake `lc1` data into QuestDB for testing |
| `package.json` | Node dependencies (`ws`, `pg`) |
