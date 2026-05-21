"""Run Supabase migrations via the Management API.

Reads SUPABASE_ACCESS_TOKEN from backend/.env and POSTs each migration file's
SQL to https://api.supabase.com/v1/projects/{ref}/database/query.

Usage:
    python run_migrations.py             # run all in order
    python run_migrations.py v2 v3 v4    # run only matching files
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"

MIGRATIONS_ORDER = [
    "supabase_migration.sql",
    "supabase_migration_credits.sql",
    "supabase_migration_series.sql",
    "supabase_migration_studio.sql",
    "supabase_migration_wibu.sql",
    "supabase_migration_admin.sql",
    "supabase_migration_v2_features.sql",
    "supabase_migration_v3_features.sql",
    "supabase_migration_v4_features.sql",
    "supabase_migration_v4_security.sql",
    "supabase_migration_v5_forum.sql",
    "supabase_migration_v6_forum_attachments.sql",
]


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def project_ref_from_url(url: str) -> str:
    # https://atabawwoqwunpapxddda.supabase.co  -> atabawwoqwunpapxddda
    host = url.replace("https://", "").replace("http://", "").split("/")[0]
    return host.split(".")[0]


def run_sql(ref: str, token: str, sql: str) -> tuple[int, str]:
    url = f"https://api.supabase.com/v1/projects/{ref}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "storylens-migrations/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as e:
        return 0, f"URLError: {e}"


def main() -> int:
    env = load_env(ENV_FILE)
    token = env.get("SUPABASE_ACCESS_TOKEN")
    url = env.get("SUPABASE_URL")
    if not token:
        print("ERROR: SUPABASE_ACCESS_TOKEN missing in .env", file=sys.stderr)
        return 2
    if not url:
        print("ERROR: SUPABASE_URL missing in .env", file=sys.stderr)
        return 2

    ref = project_ref_from_url(url)
    print(f"Project ref: {ref}")

    filters = [a.lower() for a in sys.argv[1:]]
    targets = MIGRATIONS_ORDER
    if filters:
        targets = [m for m in MIGRATIONS_ORDER if any(f in m.lower() for f in filters)]

    print(f"Will run {len(targets)} migration(s):")
    for m in targets:
        print(f"  - {m}")
    print()

    failures = 0
    for name in targets:
        path = ROOT / name
        if not path.exists():
            print(f"[SKIP] {name}: file not found")
            continue
        sql = path.read_text(encoding="utf-8")
        print(f"[RUN ] {name}  ({len(sql):,} chars) ... ", end="", flush=True)
        status, body = run_sql(ref, token, sql)
        if 200 <= status < 300:
            print(f"OK ({status})")
        else:
            failures += 1
            print(f"FAIL ({status})")
            print("  Response:", body[:2000])
            print()

    print()
    if failures:
        print(f"Done with {failures} failure(s).")
        return 1
    print("All migrations applied successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
