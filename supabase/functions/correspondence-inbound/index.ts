// Correspondence Inbound — the phone bridge.
//
// Receives a message relayed from the phone (an iOS Shortcut on an incoming text,
// the Mac agent reading Messages or WhatsApp, or a hand-paste) and lands it in the
// correspondence ledger, untriaged, for the next Pass to pick up.
//
// POST JSON:
//   {
//     channel:        "sms" | "whatsapp" | "signal" | "telegram" | "instagram" | "voice" | "other",
//     sender:         "Name as it appears",
//     sender_handle?: "+13105551234" | "email" | "@handle",
//     body:           "the message text",
//     received_at?:   ISO-8601 (defaults to now),
//     external_id?:   stable thread key (defaults to channel:handle-or-sender),
//     subject?:       string,
//     source?:        "shortcut" | "mac-agent" | "paste"   (defaults to "shortcut")
//   }
// Header:  x-correspondence-secret: <CORRESPONDENCE_INBOUND_SECRET>
//
// One row per thread, not per message: a repeat sender updates their row and reopens
// it as 'new', keeping whatever tier and flags a Pass or Adi Marie already set.
// See docs/correspondence-phone-channels-261007.md.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correspondence-secret",
};

const CHANNELS = new Set([
  "sms", "whatsapp", "signal", "telegram", "instagram", "voice", "other",
]);
const SOURCES = new Set(["shortcut", "mac-agent", "paste"]);

interface InboundMessage {
  channel: string;
  sender: string;
  sender_handle?: string;
  body: string;
  received_at?: string;
  external_id?: string;
  subject?: string;
  source?: string;
}

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normalize a phone/email/handle into a stable thread key component. */
function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  // Looks like a phone number: keep digits only, drop a leading country "1" for US numbers.
  if (digits.length >= 10 && digits.length === trimmed.replace(/[\s().-]/g, "").length) {
    const d = digits.replace(/^\+/, "");
    return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  }
  return trimmed.toLowerCase();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "POST only" });
  }

  // Auth: a shared secret the Shortcut and the Mac agent carry. No secret set = closed.
  const expected = Deno.env.get("CORRESPONDENCE_INBOUND_SECRET");
  const provided = req.headers.get("x-correspondence-secret");
  if (!expected || !provided || provided !== expected) {
    return json(401, { error: "Not authorized" });
  }

  let msg: InboundMessage;
  try {
    msg = await req.json();
  } catch {
    return json(400, { error: "Body must be JSON" });
  }

  const channel = (msg.channel || "").toLowerCase().trim();
  const sender = (msg.sender || "").trim();
  const body = (msg.body || "").trim();
  if (!CHANNELS.has(channel)) {
    return json(400, { error: `channel must be one of: ${[...CHANNELS].join(", ")}` });
  }
  if (!sender || !body) {
    return json(400, { error: "sender and body are required" });
  }

  const handle = msg.sender_handle?.trim() || null;
  const externalId =
    msg.external_id?.trim() ||
    `${channel}:${normalizeHandle(handle || sender)}`;
  const receivedAt = msg.received_at && !isNaN(Date.parse(msg.received_at))
    ? new Date(msg.received_at).toISOString()
    : new Date().toISOString();
  const source = SOURCES.has(msg.source || "") ? msg.source! : "shortcut";
  const gist = body.length > 140 ? body.slice(0, 137) + "…" : body;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing, error: findError } = await supabase
      .from("correspondence_threads")
      .select("id, tier, status, nudge_count")
      .eq("channel", channel)
      .eq("external_id", externalId)
      .maybeSingle();
    if (findError) throw findError;

    if (existing) {
      // A new inbound reopens the thread. Tier and flags are preserved — a Pass or
      // Adi Marie placed them, and the bridge does not second-guess that.
      const { error } = await supabase
        .from("correspondence_threads")
        .update({
          counterpart: sender,
          counterpart_handle: handle ?? undefined,
          subject: msg.subject?.trim() || undefined,
          gist,
          last_inbound_body: body,
          last_inbound_at: receivedAt,
          status: "new",
          source,
          is_archived: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
      return json(200, { ok: true, id: existing.id, reopened: true, tier: existing.tier });
    }

    const { data: created, error: insertError } = await supabase
      .from("correspondence_threads")
      .insert({
        channel,
        external_id: externalId,
        counterpart: sender,
        counterpart_handle: handle,
        subject: msg.subject?.trim() || null,
        gist,
        last_inbound_body: body,
        last_inbound_at: receivedAt,
        tier: "untriaged",
        status: "new",
        source,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    return json(201, { ok: true, id: created.id, reopened: false, tier: "untriaged" });
  } catch (error) {
    console.error("correspondence-inbound error:", error);
    return json(500, { error: "Failed to record message" });
  }
});
