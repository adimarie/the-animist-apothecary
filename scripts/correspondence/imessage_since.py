#!/usr/bin/env python3
"""
imessage_since.py — read texts and iMessages from the Mac's Messages database,
and optionally relay them to the correspondence ledger.

Runs on the Mac, never in the cloud. Requires:
  - Messages in iCloud turned on (so the phone's texts sync to the Mac)
  - Terminal (or whatever runs this) granted Full Disk Access:
    System Settings → Privacy & Security → Full Disk Access

Usage:
  scripts/correspondence/imessage_since.py                      # inbound, last 12 hours, JSON to stdout
  scripts/correspondence/imessage_since.py --hours 36
  scripts/correspondence/imessage_since.py --since "2026-10-07 08:00"
  scripts/correspondence/imessage_since.py --all                # include messages Adi Marie sent
  scripts/correspondence/imessage_since.py --post               # also POST each inbound to the ledger

--post reads two environment variables:
  CORRESPONDENCE_INBOUND_URL     https://<project>.supabase.co/functions/v1/correspondence-inbound
  CORRESPONDENCE_INBOUND_SECRET  the shared secret set on that function
  SUPABASE_ANON_KEY              optional; sent as Authorization: Bearer if the function verifies JWTs

Output is one JSON array. Each item:
  { rowid, received_at, from_me, handle, chat_id, chat_name, text, decoded_from_blob }

Nothing here writes to the Messages database. Read-only, always.
"""

import argparse
import datetime as dt
import json
import os
import sqlite3
import sys
import urllib.request

DB_DEFAULT = os.path.expanduser("~/Library/Messages/chat.db")
APPLE_EPOCH_OFFSET = 978307200  # seconds between 1970-01-01 and 2001-01-01


def apple_ns_to_local(ns: int) -> str:
    """Messages stores dates as nanoseconds since 2001-01-01 (UTC)."""
    seconds = ns / 1_000_000_000 if ns > 10_000_000_000 else ns
    ts = dt.datetime.fromtimestamp(seconds + APPLE_EPOCH_OFFSET, tz=dt.timezone.utc)
    return ts.astimezone().isoformat(timespec="seconds")


def local_to_apple_ns(when: dt.datetime) -> int:
    if when.tzinfo is None:
        when = when.astimezone()
    return int((when.timestamp() - APPLE_EPOCH_OFFSET) * 1_000_000_000)


def decode_attributed_body(blob: bytes):
    """
    Since macOS Ventura, Messages often leaves `text` NULL and keeps the string in
    `attributedBody` (a typedstream archive). This is the common heuristic for pulling
    the string out: it follows the NSString class marker; the length is one byte, or
    0x81 followed by a two-byte little-endian length when longer than 127.
    Best effort. Returns None when it cannot be read, and the caller marks the row.
    """
    try:
        i = blob.find(b"NSString")
        if i == -1:
            return None
        i += len(b"NSString") + 5  # skip the class marker bytes that precede the length
        if blob[i] == 0x81:
            length = int.from_bytes(blob[i + 1:i + 3], "little")
            i += 3
        else:
            length = blob[i]
            i += 1
        text = blob[i:i + length].decode("utf-8", "replace").strip()
        return text or None
    except Exception:
        return None


def read_messages(db_path: str, since: dt.datetime, inbound_only: bool):
    if not os.path.exists(db_path):
        sys.exit(f"Messages database not found at {db_path}. Is Messages in iCloud on?")
    # Read-only URI so we never take a write lock on Messages' own database.
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    sql = """
        select
          m.ROWID                                  as rowid,
          m.date                                   as date_ns,
          m.is_from_me                             as from_me,
          coalesce(h.id, c.chat_identifier, '')    as handle,
          coalesce(c.chat_identifier, h.id, '')    as chat_id,
          coalesce(c.display_name, '')             as chat_name,
          m.text                                   as text,
          m.attributedBody                         as blob
        from message m
        left join handle h            on h.ROWID = m.handle_id
        left join chat_message_join j on j.message_id = m.ROWID
        left join chat c              on c.ROWID = j.chat_id
        where m.date >= ?
          and (? = 0 or m.is_from_me = 0)
          and m.associated_message_type = 0        -- skip tapbacks/reactions
        order by m.date asc
    """
    rows = conn.execute(sql, (local_to_apple_ns(since), 0 if inbound_only else 1)).fetchall()
    conn.close()

    out = []
    for r in rows:
        text, decoded = r["text"], False
        if not text and r["blob"]:
            text, decoded = decode_attributed_body(r["blob"]), True
        out.append({
            "rowid": r["rowid"],
            "received_at": apple_ns_to_local(r["date_ns"]),
            "from_me": bool(r["from_me"]),
            "handle": r["handle"],
            "chat_id": r["chat_id"],
            "chat_name": r["chat_name"],
            "text": text or "[rich or attachment-only message — open in Messages]",
            "decoded_from_blob": decoded,
        })
    return out


def post_to_ledger(items):
    url = os.environ.get("CORRESPONDENCE_INBOUND_URL")
    secret = os.environ.get("CORRESPONDENCE_INBOUND_SECRET")
    if not url or not secret:
        sys.exit("--post needs CORRESPONDENCE_INBOUND_URL and CORRESPONDENCE_INBOUND_SECRET")
    headers = {"Content-Type": "application/json", "x-correspondence-secret": secret}
    anon = os.environ.get("SUPABASE_ANON_KEY")
    if anon:
        headers["Authorization"] = f"Bearer {anon}"
        headers["apikey"] = anon

    posted = 0
    for it in items:
        if it["from_me"]:
            continue  # the ledger tracks inbound; Adi Marie's own sends are reconciled by the Pass
        payload = {
            "channel": "sms",
            "sender": it["chat_name"] or it["handle"],
            "sender_handle": it["handle"],
            "body": it["text"],
            "received_at": it["received_at"],
            "external_id": f"sms:{it['chat_id']}",
            "source": "mac-agent",
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                resp.read()
                posted += 1
        except Exception as e:  # keep going; report at the end
            print(f"  ! failed for {payload['sender']} at {it['received_at']}: {e}", file=sys.stderr)
    print(f"posted {posted} inbound message(s) to the ledger", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=os.environ.get("IMESSAGE_DB", DB_DEFAULT))
    ap.add_argument("--hours", type=float, default=12.0, help="look back this many hours (default 12)")
    ap.add_argument("--since", help='local time, e.g. "2026-10-07 08:00" — overrides --hours')
    ap.add_argument("--all", action="store_true", help="include messages sent by Adi Marie")
    ap.add_argument("--post", action="store_true", help="also POST inbound messages to the ledger")
    args = ap.parse_args()

    if args.since:
        since = dt.datetime.fromisoformat(args.since).astimezone()
    else:
        since = dt.datetime.now().astimezone() - dt.timedelta(hours=args.hours)

    items = read_messages(args.db, since, inbound_only=not args.all)
    json.dump(items, sys.stdout, indent=2, ensure_ascii=False)
    print()
    if args.post:
        post_to_ledger(items)


if __name__ == "__main__":
    main()
