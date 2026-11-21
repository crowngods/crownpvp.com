#!/usr/bin/env python3
"""Mirror LiteBans punishments (bans, mutes, warnings, kicks) into the CrownPVP website.

Reads the LiteBans MySQL database and pushes records to  POST <SITE_URL>/api/punishments/sync.
IP addresses are never read or sent. Settings come from environment variables or a `.env`
file next to this script (copy `.env.example` to `.env`; never commit or upload `.env`).

  pip install pymysql
  python3 sync-litebans.py --check         # test the database connection, send nothing
  python3 sync-litebans.py --dry-run       # read everything, show counts, send nothing
  python3 sync-litebans.py                 # one full sync
  python3 sync-litebans.py --days 7        # one sync of the last 7 days + all active + recent removals
  python3 sync-litebans.py --loop 60       # full sync, then every 60 s (recent changes only)
  python3 sync-litebans.py --export out    # GitHub Pages mode: write out/ban.json, mute.json, ... (no backend needed)
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
KINDS = {"ban": "bans", "mute": "mutes", "warn": "warnings", "kick": "kicks"}
BATCH = 500


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
        sys.exit(f"Missing setting {name}. Copy .env.example to .env and fill it in.")
    return v


def connect():
    import pymysql  # imported here so --help works without it
    return pymysql.connect(
        host=cfg("DB_HOST", required=True), port=int(cfg("DB_PORT", "3306")),
        user=cfg("DB_USER", required=True), password=cfg("DB_PASS", required=True),
        database=cfg("DB_NAME", required=True), connect_timeout=15, read_timeout=120,
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)


def prefix():
    p = cfg("LITEBANS_PREFIX", "litebans_")
    if not re.fullmatch(r"[A-Za-z0-9_]*", p):
        sys.exit("LITEBANS_PREFIX may only contain letters, digits and underscores.")
    return p


def columns(cur, table):
    cur.execute(f"SELECT * FROM {table} LIMIT 0")
    return {d[0].lower() for d in cur.description}


def fetch_kind(cur, kind, since_ms):
    """Yield raw rows for one punishment type. Only selects columns that exist in this LiteBans version."""
    table = prefix() + KINDS[kind]
    have = columns(cur, table)
    sel = ["t.id", "t.uuid", "t.reason", "t.time"]
    sel.append("t.banned_by_name" if "banned_by_name" in have else "NULL AS banned_by_name")
    sel.append("t.banned_by_uuid" if "banned_by_uuid" in have else "NULL AS banned_by_uuid")
    sel.append("t.until" if "until" in have else "0 AS until")
    sel.append("t.active" if "active" in have else "0 AS active")
    sel.append("t.removed_by_name" if "removed_by_name" in have else "NULL AS removed_by_name")
    where, args = "", []
    if since_ms:
        conds = ["t.time >= %s"]; args.append(since_ms)
        if "active" in have:
            conds.append("t.active = 1")
        if "removed_by_date" in have:  # catches old punishments that were lifted recently
            conds.append("t.removed_by_date >= %s")
            args.append((datetime.fromtimestamp(since_ms / 1000, timezone.utc) - timedelta(hours=26)).strftime("%Y-%m-%d %H:%M:%S"))
        where = "WHERE " + " OR ".join(conds)
    cur.execute(f"SELECT {', '.join(sel)} FROM {table} t {where} ORDER BY t.id", args)
    return cur.fetchall()


def latest_names(cur, uuids):
    """uuid -> most recent known username, from litebans_history."""
    out, uuids, hist = {}, sorted(uuids), prefix() + "history"
    for i in range(0, len(uuids), 500):
        chunk = uuids[i:i + 500]
        ph = ",".join(["%s"] * len(chunk))
        cur.execute(f"SELECT h.uuid, h.name FROM {hist} h JOIN (SELECT uuid, MAX(date) AS d FROM {hist} "
                    f"WHERE uuid IN ({ph}) GROUP BY uuid) m ON h.uuid = m.uuid AND h.date = m.d", chunk)
        for r in cur.fetchall():
            if r["name"]:
                out[r["uuid"]] = r["name"]
    return out


def records(cur, kinds, since_ms):
    console = {"console", (cfg("CONSOLE_NAME", "Console") or "console").lower()}
    for kind in kinds:
        rows = [r for r in fetch_kind(cur, kind, since_ms) if r["uuid"] and not str(r["uuid"]).startswith("#")]
        names = latest_names(cur, {r["uuid"] for r in rows})
        for r in rows:
            staff = r["banned_by_name"] or ""
            if str(r["banned_by_uuid"] or "").upper() == "CONSOLE" or staff.lower() in console or not staff:
                staff = "CONSOLE"
            yield {
                "type": kind, "id": r["id"], "uuid": r["uuid"],
                "name": names.get(r["uuid"]) or str(r["uuid"])[:8],
                "staff": staff, "reason": r["reason"] or "",
                "time": int(r["time"] or 0), "until": int(r["until"] or 0),
                "active": bool(r["active"]), "removed_by": r["removed_by_name"] or None,
            }


def push(batch):
    site = cfg("SITE_URL", required=True).strip().rstrip("/")
    token = cfg("SYNC_TOKEN", required=True).strip()
    req = urllib.request.Request(
        site + "/api/punishments/sync", data=json.dumps({"records": batch}).encode("utf-8"),
        headers={"content-type": "application/json", "x-requested-with": "crown",
                 "authorization": "Bearer " + token, "user-agent": "CrownPVP-LiteBans-Sync/2.0"})
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return int(json.load(r)["count"])
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code in (400, 401, 403, 404):  # retrying will not help
                hint = {401: "SYNC_TOKEN does not match the one in Cloudflare.", 404: "Check SITE_URL.",
                        403: "Blocked (Cloudflare bot protection or wrong URL)."}.get(e.code, "")
                raise RuntimeError(f"Website answered {e.code}. {hint} {body}")
            last = f"HTTP {e.code} {body}"
        except Exception as e:  # network hiccup
            last = str(e)
        time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not reach the website: {last}")


def run_once(days, dry=False):
    since = int((time.time() - days * 86400) * 1000) if days else 0
    db = connect()
    total, batch = 0, []
    counts = dict.fromkeys(KINDS, 0)
    try:
        with db.cursor() as cur:
            for rec in records(cur, KINDS, since):
                counts[rec["type"]] += 1
                if dry:
                    continue
                batch.append(rec)
                if len(batch) >= BATCH:
                    total += push(batch); batch = []
        if batch:
            total += push(batch)
    finally:
        db.close()
    label = "read (dry run, nothing sent)" if dry else "synced"
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {label}: " + ", ".join(f"{v} {k}s" for k, v in counts.items()))
    return total


def export(outdir, limit):
    """Write static JSON files (one per punishment type) for hosting on GitHub Pages. Sends nothing anywhere."""
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    keys = ("id", "uuid", "name", "staff", "reason", "time", "until", "active", "removed_by")
    db = connect()
    counts = {}
    try:
        with db.cursor() as cur:
            for kind in KINDS:
                recs = sorted(records(cur, [kind], 0), key=lambda r: (r["time"], r["id"]), reverse=True)
                counts[kind] = len(recs)
                data = [{k: r[k] for k in keys} for r in recs[:limit]]
                (out / f"{kind}.json").write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    finally:
        db.close()
    (out / "meta.json").write_text(json.dumps({"updated": int(time.time() * 1000), "counts": counts, "limit": limit}), encoding="utf-8")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] exported to {out}: " + ", ".join(f"{v} {k}s" for k, v in counts.items()))


def check():
    db = connect()
    with db.cursor() as cur:
        for t in ("bans", "mutes", "warnings", "kicks", "history"):
            cur.execute(f"SELECT COUNT(*) AS c FROM {prefix()}{t}")
            print(f"{prefix()}{t}: {cur.fetchone()['c']} rows")
    db.close()
    print("Database connection OK.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=0, help="only records from the last N days (plus active/recently lifted)")
    ap.add_argument("--loop", type=int, default=0, metavar="SECONDS", help="repeat forever")
    ap.add_argument("--dry-run", action="store_true", help="read from LiteBans but do not send")
    ap.add_argument("--export", metavar="DIR", help="write static JSON files for GitHub Pages instead of pushing to a backend")
    ap.add_argument("--export-limit", type=int, default=10000, help="max records per type in --export (newest first)")
    ap.add_argument("--check", action="store_true", help="test the database connection and exit")
    a = ap.parse_args()
    load_env()
    if a.check:
        return check()
    if a.export:
        return export(a.export, a.export_limit)
    if a.loop > 0:
        first = True
        while True:
            try:
                run_once(0 if (first and not a.days) else (a.days or 7), a.dry_run)
                first = False
            except Exception as exc:
                print(f"[sync error] {exc}", file=sys.stderr)
            time.sleep(a.loop)
    run_once(a.days, a.dry_run)


if __name__ == "__main__":
    sys.exit(main())
