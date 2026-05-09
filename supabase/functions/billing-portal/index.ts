// Phase 7: Stripe Customer Portal redirect for the "プランを管理する" button.
// See roadmap.md "Phase 7".
//
// Input: {} (caller via Authorization header).
// Output: { url: string } — the portal URL to redirect to.
//
// Requires the user to already have a stripe_customer_id (i.e. has paid at
// least once). Returns 409 otherwise so the UI can fall back to checkout.

import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (
  !STRIPE_SECRET_KEY ||
  !APP_BASE_URL ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error("Missing env: STRIPE_SECRET_KEY / APP_BASE_URL / SUPABASE_*");
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
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return jsonError(500, "db_error", profileErr?.message ?? "profile not found");
  }
  if (!profile.stripe_customer_id) {
    return jsonError(409, "no_customer", "No Stripe customer on file (run checkout first)");
  }

  const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: profile.stripe_customer_id,
      return_url: `${APP_BASE_URL}/profile/account`,
    }).toString(),
  });
  if (!portalRes.ok) {
    const text = await portalRes.text();
    console.error("[billing-portal] Stripe error:", portalRes.status, text);
    return jsonError(502, "stripe_error", `Stripe ${portalRes.status}`);
  }
  const session = (await portalRes.json()) as { url: string };
  if (!session.url) {
    return jsonError(502, "stripe_error", "Stripe returned no portal URL");
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
