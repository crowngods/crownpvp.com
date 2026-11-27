#!/usr/bin/env python3
"""Send CrownPVP LiteBans join history to the private /trace dashboard.

Reads uuid, name, ip and date from the LiteBans history table of YOUR server and posts them to the
trace Edge Function (/sync). The function turns every IP into a keyed fingerprint (HMAC) and discards the
raw address, so the dashboard never shows or stores plain IPs. Run it only from a machine you control.

  pip install pymysql
  python3 trace-sync.py --check          test the database connection, send nothing
  python3 trace-sync.py --dry-run        count what would be sent, send nothing
  python3 trace-sync.py --days 90        send the last 90 days (default)
  python3 trace-sync.py --days 0         send the entire history
  python3 trace-sync.py --loop 300       send, then repeat every 300 s with the last 2 days

Settings (environment or the .env file next to this script): DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME,
LITEBANS_PREFIX, TRACE_URL, TRACE_SYNC_TOKEN.
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_RECORDS, MAX_LOGINS, MAX_PER_PLAYER = 500, 2000, 100
UUID_RE = re.compile(r"^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$", re.I)
NAME_RE = re.compile(r"^[A-Za-z0-9_.]{1,16}$")


def load_env():
    f = HERE / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
            v = v[1:-1]
        os.environ.setdefault(k, v)


def cfg(name, default=None, required=False):
    v = os.environ.get(name, default)
    if required and not v:
        sys.exit(f"Missing setting {name}. Add it to the .env file next to this script.")
    return v


def connect():
    import pymysql
    return pymysql.connect(
        host=cfg("DB_HOST", required=True), port=int(cfg("DB_PORT", "3306")),
        user=cfg("DB_USER", required=True), password=cfg("DB_PASS", required=True),
        database=cfg("DB_NAME", required=True), connect_timeout=15, read_timeout=300,
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)


def history_table():
    p = cfg("LITEBANS_PREFIX", "litebans_")
    if not re.fullmatch(r"[A-Za-z0-9_]*", p):
        sys.exit("LITEBANS_PREFIX may only contain letters, digits and underscores.")
    return p + "history"


def to_ms(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return int(value.timestamp() * 1000)
    return None


def fix_uuid(u):
    u = str(u).replace("-", "").lower()
    return f"{u[:8]}-{u[8:12]}-{u[12:16]}-{u[16:20]}-{u[20:]}"


def read_history(cur, days):
    table = history_table()
    sql = f"SELECT uuid, name, ip, date FROM {table} WHERE ip IS NOT NULL AND ip <> ''"
    args = []
    if days > 0:
        sql += " AND date >= %s"
        args.append(datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days))
    sql += " ORDER BY date ASC"
    cur.execute(sql, args)
    players = {}
    for r in cur.fetchall():
        uuid, name, at = r["uuid"], r["name"], to_ms(r["date"])
        if not uuid or at is None or not UUID_RE.match(str(uuid)) or not NAME_RE.match(str(name or "")):
            continue
        p = players.setdefault(fix_uuid(uuid), {"name": name, "logins": {}})
        p["name"] = name
        p["logins"][(at, r["ip"])] = {"at": at, "ip": str(r["ip"]), "source": "litebans history"}
    return players


def batches(players):
    batch, logins = [], 0
    for uuid, p in players.items():
        items = sorted(p["logins"].values(), key=lambda x: x["at"], reverse=True)
        for i in range(0, len(items), MAX_PER_PLAYER):
            part = items[i:i + MAX_PER_PLAYER]
            if batch and (len(batch) >= MAX_RECORDS or logins + len(part) > MAX_LOGINS):
                yield batch
                batch, logins = [], 0
            batch.append({"uuid": uuid, "name": p["name"], "logins": part})
            logins += len(part)
    if batch:
        yield batch


def post(batch):
    url = cfg("TRACE_URL", required=True)
    if not url.startswith("https://"):
        sys.exit("TRACE_URL must start with https://")
    req = urllib.request.Request(url, data=json.dumps({"records": batch}).encode(), method="POST", headers={
        "Authorization": "Bearer " + cfg("TRACE_SYNC_TOKEN", required=True), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"Trace service refused the data: HTTP {e.code} {e.read()[:300].decode('utf-8', 'replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach the trace service: {e.reason}")


def run(days, dry):
    conn = connect()
    try:
        with conn.cursor() as cur:
            players = read_history(cur, days)
    finally:
        conn.close()
    total = sum(len(p["logins"]) for p in players.values())
    print(f"Read {len(players)} players and {total} join records.")
    if dry:
        return
    sent = 0
    for batch in batches(players):
        post(batch)
        sent += len(batch)
        print(f"Sent {sent} player records...")
    print("Done.")


def main():
    load_env()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--loop", type=int, default=0)
    a = ap.parse_args()
    if a.check:
        conn = connect()
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS n FROM {history_table()}")
            print("Database OK. History rows:", cur.fetchone()["n"])
        conn.close()
        return
    run(a.days, a.dry_run)
    while a.loop > 0:
        time.sleep(a.loop)
        run(2, a.dry_run)


if __name__ == "__main__":
    main()
