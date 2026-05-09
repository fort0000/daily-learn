// Phase 7: create a Stripe Checkout Session for the upgrade flow.
// See roadmap.md "Phase 7".
//
// Input: {} (the caller is identified by the Authorization header).
// Output: { url: string } — the Checkout Session URL to redirect to.
//
// We reuse the user's stripe_customer_id when one already exists; otherwise
// Stripe creates a Customer when checkout completes and the webhook stores
// the resulting customer.id back onto profiles.

import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (
  !STRIPE_SECRET_KEY ||
  !STRIPE_PRICE_ID ||
  !APP_BASE_URL ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing env: STRIPE_SECRET_KEY / STRIPE_PRICE_ID / APP_BASE_URL / SUPABASE_*",
  );
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

// Stripe accepts application/x-www-form-urlencoded for all REST endpoints.
// Avoid pulling in the stripe-deno SDK (it adds boot time + cold-start cost).
function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function stripePost(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form(body),
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
  if (userErr || !user) {
    return jsonError(401, "unauthorized", userErr?.message ?? "Invalid session");
  }

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Look up an existing customer ID so the user re-uses the same Stripe
  // Customer record across re-subscriptions (keeps invoice history together).
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("plan, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return jsonError(500, "db_error", profileErr?.message ?? "profile not found");
  }
  if (profile.plan === "paid") {
    return jsonError(409, "already_paid", "Plan is already paid");
  }

  const sessionParams: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": STRIPE_PRICE_ID!,
    "line_items[0][quantity]": "1",
    success_url: `${APP_BASE_URL}/upgrade?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_BASE_URL}/upgrade?status=cancel`,
    client_reference_id: user.id,
    // Required so the webhook can map back to the auth user even if
    // stripe_customer_id is not yet set on profiles.
    "metadata[user_id]": user.id,
    "subscription_data[metadata][user_id]": user.id,
    allow_promotion_codes: "true",
  };
  if (profile.stripe_customer_id) {
    sessionParams.customer = profile.stripe_customer_id;
  } else if (user.email) {
    sessionParams.customer_email = user.email;
  }

  const stripeRes = await stripePost("/checkout/sessions", sessionParams);
  if (!stripeRes.ok) {
    const text = await stripeRes.text();
    console.error("[billing-checkout] Stripe error:", stripeRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${stripeRes.status}`);
  }
  const session = (await stripeRes.json()) as { id: string; url: string };
  if (!session.url) {
    return jsonError(502, "stripe_error", "Stripe returned no Checkout URL");
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
