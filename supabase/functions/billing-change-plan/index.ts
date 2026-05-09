// Phase 7 follow-up: swap the billing cadence (monthly ↔ yearly) on the user's
// existing Stripe subscription. Avoids the Stripe Customer Portal round-trip
// when the user just wants to change cadence.
//
// Input: { billing: 'monthly' | 'yearly' }
// Output: { billing, period_end }
//
// Returns 409 if the user is not subscribed, or already on the requested
// cadence, or the requested price isn't configured.

import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_PRICE_ID_MONTHLY =
  Deno.env.get("STRIPE_PRICE_ID_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ID");
const STRIPE_PRICE_ID_YEARLY = Deno.env.get("STRIPE_PRICE_ID_YEARLY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (
  !STRIPE_SECRET_KEY ||
  !STRIPE_PRICE_ID_MONTHLY ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error("Missing env: STRIPE_SECRET_KEY / STRIPE_PRICE_ID_MONTHLY / SUPABASE_*");
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

  let payload: { billing?: "monthly" | "yearly" };
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }
  const target = payload.billing === "yearly" ? "yearly" : "monthly";
  const targetPriceId =
    target === "yearly" ? STRIPE_PRICE_ID_YEARLY : STRIPE_PRICE_ID_MONTHLY;
  if (!targetPriceId) {
    return jsonError(409, "cadence_unavailable", `${target} price is not configured`);
  }

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
  if (profile.plan !== "paid" || !profile.stripe_customer_id) {
    return jsonError(409, "not_subscribed", "Not on a paid plan");
  }

  // Find the active subscription. Fetch with expand=items so we get the
  // existing item id (needed by the swap call) and its current price id.
  const subsRes = await stripeGet(
    `/subscriptions?customer=${encodeURIComponent(profile.stripe_customer_id)}&status=active&limit=1`,
  );
  if (!subsRes.ok) {
    const text = await subsRes.text();
    console.error("[billing-change-plan] subscription list failed:", subsRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${subsRes.status}`);
  }
  const subs = (await subsRes.json()) as {
    data: Array<{
      id: string;
      items: { data: Array<{ id: string; price: { id: string } }> };
    }>;
  };
  const sub = subs.data[0];
  if (!sub) {
    return jsonError(409, "no_subscription", "No active subscription found");
  }
  const item = sub.items.data[0];
  if (!item) {
    return jsonError(500, "stripe_error", "Subscription has no items");
  }

  if (item.price.id === targetPriceId) {
    return jsonError(409, "already_on_cadence", "Subscription already uses the requested cadence");
  }

  // Swap the price item with proration so the user pays / gets credited
  // immediately for the cadence change.
  const updateRes = await stripePost(`/subscriptions/${sub.id}`, {
    "items[0][id]": item.id,
    "items[0][price]": targetPriceId,
    proration_behavior: "create_prorations",
    "metadata[billing]": target,
    // Clear any pending cancellation when switching to a different plan.
    cancel_at_period_end: "false",
  });
  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.error("[billing-change-plan] update failed:", updateRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${updateRes.status}`);
  }
  const updated = (await updateRes.json()) as {
    cancel_at: number | null;
    cancel_at_period_end: boolean;
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };

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
      subscription_billing: target,
    })
    .eq("id", user.id);

  return new Response(
    JSON.stringify({ billing: target, period_end: periodEndIso }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
