#!/usr/bin/env python3
"""
Workshop Test Ingestion Script
────────────────────────────────
Creates the workshop_example table in QuestDB (if it doesn't exist)
and streams simulated lc1 (load cell) values at 10 Hz so you can
watch them render live in the dashboard.

Usage:
    python ingest_test.py
    python ingest_test.py --duration 60   # run for 60 seconds (default: forever)
"""

import time
import math
import random
import argparse
import psycopg2
from datetime import datetime
from questdb.ingress import Sender

# ── QuestDB connection ────────────────────────────────────────────────────────
QUESTDB_HTTP_CONF = (
    'http::addr=localhost:9000;'
    'username=admin;'
    'password=quest;'
    'auto_flush=off;'
)

QUESTDB_PG_CONF = {
    'host':     'localhost',
    'port':     8812,
    'user':     'admin',
    'password': 'quest',
    'database': 'qdb',
}

SAMPLE_RATE_HZ  = 10
SAMPLE_INTERVAL = 1.0 / SAMPLE_RATE_HZ


# ── Table setup ───────────────────────────────────────────────────────────────
def setup_table():
    print('Setting up workshop_example table...')
    conn   = psycopg2.connect(**QUESTDB_PG_CONF)
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT table_name FROM tables()
            WHERE table_name = 'workshop_example'
        """)
        exists = cursor.fetchone() is not None

        if exists:
            print('  Table exists — truncating...')
            cursor.execute('TRUNCATE TABLE workshop_example')
            conn.commit()
        else:
            print('  Table not found — creating...')
            cursor.execute("""
                CREATE TABLE workshop_example (
                    timestamp TIMESTAMP,
                    lc1       DOUBLE
                ) TIMESTAMP(timestamp) PARTITION BY DAY
            """)
            conn.commit()
            print('  Table created.')

        print('Table ready.\n')
    finally:
        cursor.close()
        conn.close()


# ── Data generation ───────────────────────────────────────────────────────────
def generate_lc1(t):
    """
    Simulates a load cell reading:
    - Slow sine wave to mimic weight shift
    - Small random noise on top
    """
    base  = 200.0
    wave  = 80.0 * math.sin(2 * math.pi * 0.05 * t)
    noise = random.uniform(-2.0, 2.0)
    return round(base + wave + noise, 3)


# ── Ingestion loop ────────────────────────────────────────────────────────────
def ingest(duration):
    infinite = duration is None
    label    = 'forever' if infinite else f'{duration}s'
    print(f'Ingesting at {SAMPLE_RATE_HZ} Hz ({label})... Ctrl+C to stop.\n')

    samples   = 0
    t         = 0.0
    start     = time.time()
    next_tick = start

    try:
        with Sender.from_conf(QUESTDB_HTTP_CONF) as sender:
            while infinite or t < duration:
                lc1 = generate_lc1(t)

                sender.row(
                    'workshop_example',
                    columns={ 'lc1': lc1 },
                    at=datetime.now(),
                )
                sender.flush()

                samples += 1
                t       += SAMPLE_INTERVAL

                if samples % (SAMPLE_RATE_HZ * 5) == 0:
                    elapsed = time.time() - start
                    print(f'  t={elapsed:.1f}s  lc1={lc1:.3f}  samples={samples}')

                # Precise timing
                next_tick += SAMPLE_INTERVAL
                sleep_for  = next_tick - time.time()
                if sleep_for > 0:
                    time.sleep(sleep_for)

    except KeyboardInterrupt:
        print(f'\nStopped after {samples} samples.')


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='Workshop test ingestion script')
    parser.add_argument(
        '--duration', type=int, default=None,
        help='How many seconds to run (omit for infinite)',
    )
    args = parser.parse_args()

    setup_table()
    ingest(args.duration)


if __name__ == '__main__':
    main()
