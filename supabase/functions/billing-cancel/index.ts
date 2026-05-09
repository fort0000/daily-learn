// Phase 7 follow-up: in-app cancellation. Schedules the user's active Stripe
// subscription to cancel at period end and writes the resulting cancel_at /
// period_end onto profiles immediately so the UI can confirm without waiting
// for the subscription.updated webhook.
//
// Input: {} (caller via Authorization header)
// Output: { cancel_at: string | null, period_end: string | null }
//
// Returns 409 if the user has no Stripe customer / subscription on file.

import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: STRIPE_SECRET_KEY / SUPABASE_*");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toIso(unix: number | undefined | null): string | null {
  if (typeof unix !== "number" || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString();
}

async function stripeGet(path: string): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
}

async function stripePost(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST only");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError(401, "unauthorized", "Missing Authorization header");

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonError(401, "unauthorized", "Invalid session");

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return jsonError(500, "db_error", profileErr?.message ?? "profile not found");
  }
  if (!profile.stripe_customer_id) {
    return jsonError(409, "no_customer", "No Stripe customer on file");
  }
  if (profile.plan !== "paid") {
    return jsonError(409, "not_subscribed", "Not on a paid plan");
  }

  // Find the active subscription for this customer. We expect exactly one in
  // this app (single-tier plan), but list to handle edge cases gracefully.
  const subsRes = await stripeGet(
    `/subscriptions?customer=${encodeURIComponent(profile.stripe_customer_id)}&status=active&limit=1`,
  );
  if (!subsRes.ok) {
    const text = await subsRes.text();
    console.error("[billing-cancel] subscription list failed:", subsRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${subsRes.status}`);
  }
  const subs = (await subsRes.json()) as {
    data: Array<{ id: string }>;
  };
  const sub = subs.data[0];
  if (!sub) {
    return jsonError(409, "no_subscription", "No active subscription found");
  }

  // Schedule cancellation at period end. The subsequent
  // customer.subscription.updated webhook will also patch profiles, but write
  // the values back immediately so the UI confirms without polling.
  const cancelRes = await stripePost(`/subscriptions/${sub.id}`, {
    cancel_at_period_end: "true",
  });
  if (!cancelRes.ok) {
    const text = await cancelRes.text();
    console.error("[billing-cancel] cancel failed:", cancelRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${cancelRes.status}`);
  }
  const updated = (await cancelRes.json()) as {
    cancel_at: number | null;
    cancel_at_period_end: boolean;
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };

  // Stripe API 2025-09-30+ moved current_period_end from the subscription
  // object to items.data[].current_period_end. Read item-level first and fall
  // back to the legacy field so this works on both API versions.
  const periodEndUnix =
    updated.items?.data?.[0]?.current_period_end ?? updated.current_period_end;
  const periodEndIso = toIso(periodEndUnix);
  const cancelAtIso = updated.cancel_at_period_end
    ? toIso(updated.cancel_at) ?? periodEndIso
    : null;

  await admin
    .from("profiles")
    .update({
      subscription_period_end: periodEndIso,
      subscription_cancel_at: cancelAtIso,
    })
    .eq("id", user.id);

  return new Response(
    JSON.stringify({ cancel_at: cancelAtIso, period_end: periodEndIso }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
