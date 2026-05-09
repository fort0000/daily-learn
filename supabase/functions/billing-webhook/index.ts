// Phase 7: Stripe webhook handler. Updates profiles.plan and stripe_customer_id
// in response to subscription lifecycle events. See roadmap.md "Phase 7".
//
// JWT verification is OFF for this function (Stripe doesn't sign with a
// Supabase JWT). Authenticity is enforced by verifying the Stripe-Signature
// header against STRIPE_WEBHOOK_SECRET. Any unsigned/invalid request is
// rejected with 400 before touching the DB.
//
// Idempotency: every accepted event.id is recorded in billing_events. A
// duplicate insert (PK conflict) means we already processed this event and
// short-circuits the handler.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: STRIPE_WEBHOOK_SECRET / SUPABASE_*");
}

const TOLERANCE_SECONDS = 300;

function badRequest(message: string): Response {
  console.warn("[billing-webhook]", message);
  return new Response(message, { status: 400 });
}

function ok(): Response {
  return new Response("ok", { status: 200 });
}

// Verify the Stripe-Signature header per
// https://stripe.com/docs/webhooks/signatures. We re-implement the constant-
// time HMAC-SHA256 check rather than pull in stripe-deno SDK to keep cold-
// start cost down.
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const idx = kv.indexOf("=");
      return [kv.slice(0, idx), kv.slice(idx + 1)];
    }),
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > TOLERANCE_SECONDS) {
    console.warn("[billing-webhook] timestamp outside tolerance:", ageSec);
    return false;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeEqual(expected, v1);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

// resolveUserId: finds the auth user UUID for a given event by looking at
// metadata.user_id (set on Checkout) or matching stripe_customer_id back to
// the profiles row. Returns null if neither path resolves — caller logs &
// 200s the event so Stripe doesn't retry forever.
async function resolveUserId(
  admin: SupabaseClient,
  obj: Record<string, unknown>,
): Promise<{ userId: string | null; customerId: string | null }> {
  const customerId = (obj.customer as string | undefined) ?? null;
  const metaUserId =
    (obj.client_reference_id as string | undefined) ??
    ((obj.metadata as Record<string, string> | undefined)?.user_id ?? null);
  if (metaUserId) return { userId: metaUserId, customerId };
  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return { userId: (data as { id: string } | null)?.id ?? null, customerId };
  }
  return { userId: null, customerId: null };
}

async function setPlan(
  admin: SupabaseClient,
  userId: string,
  plan: "free" | "paid",
  customerId: string | null,
): Promise<void> {
  const update: Record<string, string | null> = { plan };
  if (customerId) update.stripe_customer_id = customerId;
  const { error } = await admin.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return badRequest("missing stripe-signature");

  // Read the raw body once — verification needs the exact bytes Stripe signed.
  const payload = await req.text();
  let valid = false;
  try {
    valid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[billing-webhook] signature verify threw:", err);
    return badRequest("signature verification failed");
  }
  if (!valid) return badRequest("invalid signature");

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return badRequest("invalid json");
  }

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Idempotency: insert the event id first. If it conflicts (already seen),
  // return 200 without re-applying. Stripe will stop retrying on 200.
  const { error: dupErr } = await admin
    .from("billing_events")
    .insert({ stripe_event_id: event.id, type: event.type });
  if (dupErr) {
    if ((dupErr as { code?: string }).code === "23505") {
      console.log("[billing-webhook] dup event, skipping:", event.id);
      return ok();
    }
    console.error("[billing-webhook] dedupe insert failed:", dupErr);
    return new Response("dedupe insert failed", { status: 500 });
  }

  try {
    const obj = event.data.object;
    if (event.type === "checkout.session.completed") {
      const { userId, customerId } = await resolveUserId(admin, obj);
      if (!userId) {
        console.warn("[billing-webhook] no user_id resolved for event", event.id);
        return ok();
      }
      await setPlan(admin, userId, "paid", customerId);
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused"
    ) {
      const { userId, customerId } = await resolveUserId(admin, obj);
      if (!userId) {
        console.warn("[billing-webhook] no user_id resolved for event", event.id);
        return ok();
      }
      await setPlan(admin, userId, "free", customerId);
    } else if (event.type === "customer.subscription.updated") {
      // Handle reactivation / state flips. status: active|trialing → paid,
      // anything else (canceled, unpaid, past_due, incomplete_expired) → free.
      const status = obj.status as string | undefined;
      const { userId, customerId } = await resolveUserId(admin, obj);
      if (!userId) {
        console.warn("[billing-webhook] no user_id for subscription.updated", event.id);
        return ok();
      }
      const plan = status === "active" || status === "trialing" ? "paid" : "free";
      await setPlan(admin, userId, plan, customerId);
    } else {
      // Other events (invoice.*, customer.created, etc.) are recorded for
      // audit but no action taken.
      console.log("[billing-webhook] no handler for", event.type);
    }
  } catch (err) {
    console.error("[billing-webhook] handler failed:", event.type, err);
    return new Response("handler failed", { status: 500 });
  }

  return ok();
});
