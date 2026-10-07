-- The Correspondence Practice — persistent state across sweeps.
-- Each scheduled sweep runs in a fresh session with no memory; this is the memory.
-- Sensitive: holds counterpart names and message gists. Authenticated-only, never anon.
-- See docs/correspondence-prompt-261007.md §9.
--
-- NOT YET APPLIED. Adi Marie reviews, then says run it.

create table if not exists public.correspondence_threads (
  id              uuid primary key default gen_random_uuid(),

  -- where it lives
  channel         text not null check (channel in
                    ('gmail','sms','whatsapp','signal','telegram','instagram','voice','other')),
  external_id     text,                    -- gmail thread id, sms thread key, etc.
  external_url    text,                    -- deep link back to the thread

  -- who
  counterpart     text not null,           -- name or handle as it appears
  counterpart_handle text,                 -- email / phone / @handle
  client_id       uuid references public.clients(id) on delete set null,

  -- triage (tiers per docs/correspondence-prompt-261007.md §4)
  tier            text not null check (tier in
                    ('immediate','living_arc','threshold','wheel','kin','admin','field','noise')),
  pathway         text,                    -- slug from correspondence_pathways
  subject         text,
  gist            text,                    -- one-line read of what they are asking

  -- state
  status          text not null default 'new' check (status in
                    ('new','drafted','awaiting_adi','sent','awaiting_them','parked','closed')),
  last_inbound_at   timestamptz,
  last_outbound_at  timestamptz,
  promised_by       timestamptz,           -- a stated or implied reply-by
  draft_ref         text,                  -- gmail draft id
  nudge_count       int not null default 0,
  last_nudged_at    timestamptz,

  -- judgment
  needs_her_hand  boolean not null default false,  -- only Adi Marie writes this one
  do_not_draft    boolean not null default false,  -- never auto-draft on this thread
  notes           text,

  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists correspondence_threads_channel_external
  on public.correspondence_threads (channel, external_id)
  where external_id is not null;

create index if not exists correspondence_threads_open
  on public.correspondence_threads (tier, status, last_inbound_at desc)
  where is_archived = false;

create index if not exists correspondence_threads_promised
  on public.correspondence_threads (promised_by)
  where is_archived = false and status <> 'closed';

-- One row per pass, so the practice is visible over months rather than felt daily.
create table if not exists public.correspondence_sweeps (
  id            uuid primary key default gen_random_uuid(),
  pass          text not null check (pass in ('midday','evening','reckoning','ad_hoc')),
  ran_at        timestamptz not null default now(),
  channels      text[] not null default '{}',
  scanned       int not null default 0,
  surfaced      int not null default 0,
  drafted       int not null default 0,
  immediate     int not null default 0,
  briefing      text,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists correspondence_sweeps_ran_at
  on public.correspondence_sweeps (ran_at desc);

-- The compendium (docs/correspondence-pathways-261007.md), queryable.
create table if not exists public.correspondence_pathways (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  tier          text,
  when_to_use   text not null,
  shape         text,                      -- the move the message makes, not boilerplate
  autonomy      text not null default 'draft_only' check (autonomy in
                  ('draft_only','send_after_ok','standing_send')),
  active        boolean not null default true,
  times_used    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.correspondence_threads  enable row level security;
alter table public.correspondence_sweeps   enable row level security;
alter table public.correspondence_pathways enable row level security;

drop policy if exists "authenticated full access" on public.correspondence_threads;
create policy "authenticated full access" on public.correspondence_threads
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.correspondence_sweeps;
create policy "authenticated full access" on public.correspondence_sweeps
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.correspondence_pathways;
create policy "authenticated full access" on public.correspondence_pathways
  for all to authenticated using (true) with check (true);

-- Seed the twelve pathways. Every one starts as draft_only.
insert into public.correspondence_pathways (slug, name, tier, when_to_use, shape) values
  ('threshold-welcome',  'Threshold Welcome',   'threshold',  'First contact — someone has reached out, new.',                       'Reflect their own words; one next step; door open, pressure off.'),
  ('inquiry-invitation', 'Inquiry Invitation',  'threshold',  'Moving a new inquiry toward the Inquiry Call.',                        'Name the call as a conversation; two Calendar-verified times; invite a counter.'),
  ('preparation-note',   'Preparation Note',    'wheel',      'Before a session or ceremony.',                                        'Confirm when/where; link standing prep; one line for the body. No medicine specifics.'),
  ('aftercare-reach',    'Aftercare Reach',     'living_arc', 'After — the integration check.',                                       'No agenda; one open question; integration link; permission not to reply.'),
  ('holding-note',       'Holding Note',        null,         'A full reply cannot be given today. The antidote to silence.',         'Note is with her; a real day; one line of thanks. Nothing else.'),
  ('reciprocity-note',   'Reciprocity Note',    'wheel',      'Contribution, sliding scale, the church framing.',                     'Four tiers by name; you choose; giving link. Amounts are hers — never drafted.'),
  ('referral-thanks',    'Referral Thanks',     'kin',        'To the one who sent someone.',                                         'Thanks; confidentiality named; nothing about the referred person.'),
  ('gracious-no',        'Gracious No',         'threshold',  'Capacity full, fit wrong, or not now.',                                'The no first; one reason; one real alternative or none. Never for ending a client relationship.'),
  ('rescheduling',       'Rescheduling',        'wheel',      'A date moves.',                                                        'One line; two verified times; everything else stays as it was.'),
  ('kin-note',           'Kin Note',            'kin',        'Friends and peers — short, human, unbranded.',                         'Answer the thing; one line of life; stop.'),
  ('silence-repair',     'Silence Repair',      null,         'Reaching back after weeks of silence.',                                'One sentence of ownership; then the full reply as if no time had passed.'),
  ('practitioner-peer',  'Practitioner Peer',   'kin',        'Fellow practitioners, collaborations, lineage colleagues.',            'Specific and collegial; mine is not the only way; offer the longer conversation.')
on conflict (slug) do nothing;

comment on table public.correspondence_threads is
  'The Correspondence Practice ledger: one row per live thread across all channels. Carries triage tier, pathway, state and reply-by. Sensitive (names + gists) — RLS authenticated-only, never anon.';
comment on table public.correspondence_sweeps is
  'Log of each midday/evening correspondence pass: what was scanned, surfaced, drafted.';
comment on table public.correspondence_pathways is
  'Compendium of response pathways — the shape of each kind of reply, and how much autonomy it carries.';
