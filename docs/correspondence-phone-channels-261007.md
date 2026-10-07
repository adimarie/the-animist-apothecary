# THE PHONE CHANNELS — TEXTS AND WHATSAPP
## The Animist Apothecary — how the two channels that matter most reach the practice
### Companion to `correspondence-prompt-261007.md`. Working version 2026.10.07.

---

## The plain fact first

Texts and WhatsApp live on the phone. A cloud session — the kind that runs the Midday and
Evening Passes on a schedule — cannot see a phone. There is no connector, no API, and no
honest workaround that makes it otherwise.

But a **Mac** can see both. Messages in iCloud mirrors every text and iMessage into a
database on the Mac. WhatsApp Desktop and WhatsApp Web show the same personal threads the
phone does. A Claude Code session running *on the Mac* can read what the phone receives.

So the architecture has two halves, and the ledger is the seam between them:

```
  the phone ──► iOS Shortcut ──► correspondence-inbound ──► the ledger
                                  (Edge Function)              │
  the Mac   ──► Phone Pass (local Claude Code) ────────────────┤
                reads Messages + WhatsApp, drafts, sends on yes │
                                                                ▼
  the cloud ──► Midday / Evening Pass ──── reads the ledger ◄───┘
                triages, drafts, briefs, nudges
```

Four pieces. Piece 0 needs nothing built and works today. Two more are built and in this repo. One is a five-minute setup on the phone.

---

## Piece 0 — Works today, no backend: the phone mails itself

Before any function is deployed or any table exists, the phone can already feed the
practice — because the cloud Passes read Gmail, and the phone can send Gmail.

**Texts — an iOS Shortcut that emails each incoming text to her own inbox.**
Shortcuts → Automation → + → *Message* → Run Immediately → action *Send Email*:
- To: her own practice Gmail address
- Subject: `[TEXT] ` followed by *Shortcut Input → Sender*
- Body: *Shortcut Input → Content*
- Show Compose Sheet: **off**

Every text now lands in Gmail within seconds, tagged by subject. The Passes treat
`subject:[TEXT]` as channel `sms`, triage it with everything else, and draft the reply
copy-ready in the briefing. Nothing to deploy. Five minutes.

**WhatsApp — forward the ones that matter.** On the phone: long-press the message →
Forward → share → Mail → to herself, subject `[WA] ` and the person's name. One or two taps.
The Passes treat `subject:[WA]` as channel `whatsapp`. Not automatic — WhatsApp offers no
trigger — but it is the honest fast path for the threads that actually need a reply.

**Anything, instantly — share into the Claude app.** From any message on the phone: share
→ Claude → *draft a reply to this, per the Correspondence Practice*. The reply comes back
in her voice, to copy and send. This is the path for a message that cannot wait for the
next Pass.

Piece 0 is not a lesser version. It is the bridge that exists the moment she builds the
Shortcut. Pieces 1 and 2 add completeness (history, what she sent, WhatsApp without a tap)
and sending from the Mac.

---

## Piece 1 — The Shortcut: every incoming text lands in the ledger

This is the smallest, fastest win, and it runs on the phone itself. When a text arrives, an
iOS Shortcut automation posts it to the ledger. The next Pass sees it, triages it, and
drafts. No Mac required for this half.

**On the phone — Shortcuts app → Automation → + → Message**

1. **Trigger:** *Message*. Leave *Sender* empty so it fires for anyone. If iOS insists on a
   filter before it will save, set *Message Contains* to a single space — that matches
   nearly everything.
2. Turn **on** *Run Immediately*. Turn **off** *Notify When Run*. Otherwise the phone asks
   permission every time, which defeats the point.
3. **Action:** *Get Contents of URL*
   - URL: `https://wdecjlrfulsdklqeetqb.supabase.co/functions/v1/correspondence-inbound`
   - Method: **POST**
   - Headers:
     - `Content-Type` → `application/json`
     - `x-correspondence-secret` → *the secret (see below)*
     - `Authorization` → `Bearer <the project's anon key>` — only needed if the function
       is deployed with JWT verification on. The anon key is already public in
       `crm/index.html`; it is not the secret. The secret header is what actually guards
       the door.
   - Request Body: **JSON**, four fields:
     - `channel` → `sms`
     - `sender` → *Shortcut Input → Sender* (the contact name)
     - `sender_handle` → *Shortcut Input → Sender → Phone Number*
     - `body` → *Shortcut Input → Content*
4. Save. Send yourself a text from another phone. The next Pass should name it.

**The secret.** Generate one — anything long and random — and put it in two places only:
Bitwarden (per `docs/SECRETS-BITWARDEN.md`) and the Edge Function's secrets
(`supabase secrets set CORRESPONDENCE_INBOUND_SECRET=…`, or the Supabase dashboard under
Edge Functions → Secrets). Never in this repo. Never in a commit message.

**What this gives:** every inbound text, with who and when, in the ledger within seconds.
The Pass triages it with everything else — same tiers, same pathways, same briefing.

**What it does not give:** the history before today, and the texts she sends. The Shortcut
only sees what arrives from now on. The Mac fills both gaps.

**Honest caveats:** Shortcuts automations are generally reliable but not perfect — a
restart, a Focus mode, or a Low Power state can skip one. Treat it as the fast path, with
the Mac's Messages database as the complete record. WhatsApp has no Shortcut trigger at
all; it needs Piece 2.

---

## Piece 2 — The Mac: the Phone Pass

A Claude Code session on the Mac that reads both channels directly, drafts replies, and —
on her *yes* — sends them. It can run on its own schedule or be invoked when she sits down.

### One-time setup

**Full Disk Access.** System Settings → Privacy & Security → Full Disk Access → add the
app that runs Claude Code (Terminal, iTerm, or the Claude desktop app). Without this, the
Messages database is unreadable. This is a one-time grant.

**Messages in iCloud.** On the phone: Settings → [name] → iCloud → Messages → on. On the
Mac: Messages → Settings → iMessage → Enable Messages in iCloud. Give it an hour to sync the
first time.

**WhatsApp on the Mac.** Either WhatsApp Desktop (App Store), linked to the phone as a
device, or WhatsApp Web in a browser profile that stays logged in. Both show the personal
account's threads — the ones where the relationships actually live.

**The reader script.** `scripts/correspondence/imessage_since.py` — in this repo. It reads
the Messages database read-only and prints inbound messages as JSON. Test it:

```
python3 scripts/correspondence/imessage_since.py --hours 24
```

If it prints messages, the Mac half is live. If it says the database cannot be opened,
Full Disk Access is not yet granted to the right app.

With two environment variables set, `--post` relays everything it finds into the ledger:

```
export CORRESPONDENCE_INBOUND_URL=https://wdecjlrfulsdklqeetqb.supabase.co/functions/v1/correspondence-inbound
export CORRESPONDENCE_INBOUND_SECRET=…      # from Bitwarden
python3 scripts/correspondence/imessage_since.py --hours 24 --post
```

### Reading WhatsApp — honestly

There is no clean API for a personal WhatsApp account, and there is not going to be one.
Two routes exist, and the Phone Pass tries them in order:

**Route A — the local store.** WhatsApp Desktop for Mac keeps its messages in
`~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite`. On
some versions this is readable the same way the Messages database is. On others it is not
present or not readable. *This has to be verified on her Mac; it is not promised here.* If
it reads, the Phone Pass gets WhatsApp the same way it gets texts — complete, fast, silent.

**Route B — on screen.** The local session opens WhatsApp Desktop (or WhatsApp Web) and
reads the unread conversations the way she would — by looking. Claude Code on the Mac can
drive the screen. It is slower than a database read, but it is real, it works today, it
needs no reverse-engineering, and it uses her own logged-in account. Replies go out the
same way: the session types the approved draft into the conversation and she, or it on
her word, presses send.

**On WhatsApp's terms.** Automating a personal WhatsApp account sits outside what WhatsApp
permits. In practice, what gets accounts restricted is bulk or bot-like *sending* —
messages to many people, fast, unprompted. Reading one's own conversations and sending a
handful of individually written replies on a human's say-so is not that pattern. But it is
her account and her risk, and the Phone Pass should never be set to `standing_send` on
WhatsApp. Draft, show, send on *yes*. That is the whole protocol.

### Sending texts from the Mac

Messages on the Mac can be driven by AppleScript, which means an approved draft can go out
as an iMessage or text without touching the phone:

```applescript
tell application "Messages"
  set theService to 1st account whose service type = iMessage
  set theBuddy to participant "+13105551234" of theService
  send "the approved text" to theBuddy
end tell
```

The Phone Pass uses exactly this, and only after her *yes* per message — or, for a pathway
she has graduated to `standing_send`, on its own. `rescheduling` is the only text pathway
that should ever be considered for that, and not yet.

### The Phone Pass prompt

This is what she gives Claude Code on the Mac. Once this repo is pulled there, it can read
the full operating documents; the prompt just points at them.

> Run the **Phone Pass**.
>
> Read `docs/correspondence-prompt-261007.md`, `docs/correspondence-pathways-261007.md`, and
> `docs/correspondence-phone-channels-261007.md`, and follow them.
>
> First, texts: run `scripts/correspondence/imessage_since.py --hours 14 --all` and read
> what came in and what I sent. Then WhatsApp: read the local store if it is readable;
> otherwise open WhatsApp Desktop and read every unread conversation on screen.
>
> Triage everything by tier. Anything Tier 0, stop and show me before anything else.
> Write every thread to the ledger. Draft replies per the pathways, in my voice. Show me
> the drafts, shortest first, with the thread each belongs to. Send nothing until I say
> *yes* to that draft by name. When I do, send it — AppleScript for texts, typed into the
> conversation for WhatsApp — and mark the ledger `sent`.
>
> Finish with the briefing: what you drafted, what you sent, what is still waiting on me,
> and what is older than its window.

Fourteen hours covers the gap since the previous pass with overlap; the ledger's unique
thread key means re-reading a message never duplicates it.

### Scheduling on the Mac

Two ways, and the first is simpler:

- **By hand, twice a day.** She opens Claude Code on the Mac and gives it the Phone Pass
  prompt. Midday and evening. Thirty seconds to start; it does the rest.
- **On a schedule.** Claude Code's `/loop` can repeat the Phone Pass on an interval while
  a session is open; or a `launchd` job can start the session at 12:30 and 7:30. The
  schedule only helps if the Mac is awake and logged in at those times — a laptop that is
  closed in a bag runs nothing. For a Mac that is always on, it is worth setting up; for a
  laptop, by hand is more honest.

---

## Piece 3 — The cloud Passes read the ledger

Nothing new to build here. The Midday and Evening Passes already read
`correspondence_threads`. With Pieces 1 and 2 landing texts and WhatsApp there as
`untriaged` rows, the cloud passes simply see them — and triage, draft, and brief them
alongside Gmail. Drafts for a text or WhatsApp reply appear in the briefing ready to copy,
since the cloud cannot send to the phone; the Mac Phone Pass is what sends.

If she wants the briefing *on* the phone, the cloud Pass can email it to her — the drafts
inline, copy-ready — so a WhatsApp reply can be pasted straight from Mail into WhatsApp
without a Mac in reach. That is a switch to turn on by saying so; it is not on by default,
because it is a daily automated send, even if only to herself.

---

## What stands where — 2026-10-07

| Piece | State |
|---|---|
| `correspondence-inbound` Edge Function | Written. Not deployed — deploys with the ledger. |
| Ledger migration | Written, updated for the bridge (`untriaged`, `last_inbound_body`, `source`). Not applied — hers to read first. |
| `imessage_since.py` | Written. Untested against a real Messages database — test on the Mac with `--hours 24`. |
| iOS Shortcut | Recipe above. Five minutes on the phone once the function is deployed. |
| WhatsApp local store | Unverified. The Phone Pass checks on first run and says which route it is using. |
| Mac Phone Pass | Prompt above. Runs once the repo is pulled on the Mac. |

The order to bring it up: apply the ledger → deploy the function → set the secret → build
the Shortcut → test with one text → pull the repo on the Mac → run the Phone Pass once by
hand. Each step is small. None of them should be done while the previous one is unproven.

---

## What this does not pretend to do

- It does not read Signal. Signal has no desktop database that is readable, and no API, by
  design. Signal messages that want a reply get forwarded or pasted, and the ledger takes
  them from there.
- It does not read Telegram's personal history. Same remedy.
- It does not make the cloud session able to send a text or a WhatsApp message. Only the
  Mac can, and only on her word.
- It does not run the Phone Pass if the Mac is asleep.

Nothing here is a trick. It is two honest channels into one ledger, and a Mac that can do
what the cloud cannot.
