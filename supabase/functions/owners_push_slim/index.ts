// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Deno exists at runtime
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function onlySlimFields(x: any) {
  if (!x || typeof x !== 'object') return null;
  const id = x.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const obj = {
    id,
    business_name_en: x.business_name_en ?? x.name_en ?? null,
    eik: x.eik ?? null,
    vat: x.vat ?? (x.eik ? `BG${x.eik}` : null),
    entity_type: x.entity_type ?? null,
    city_en: x.city_en ?? x.city ?? null,
    region_en: x.region_en ?? x.region ?? null,
    country_en: x.country_en ?? x.country ?? null,
  };
  if (!obj.business_name_en || !obj.eik || !obj.entity_type) return null;
  return obj;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // lightweight auth for push from trusted client/CLI
    const adminKey = req.headers.get('x-admin-key');
    const expected = Deno.env.get('ADMIN_PUSH_KEY');
    if (!expected || adminKey !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { full_name, companies } = await req.json();
    if (!full_name || !Array.isArray(companies)) {
      return new Response(JSON.stringify({ error: 'full_name and companies[] required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // filter to only EOOD / ET if entity_type provided; if not present keep as is (client should ensure)
    const slim = companies.map(onlySlimFields).filter(Boolean).filter((c: any) => {
      const t = String(c.entity_type || '').toUpperCase();
      return t === 'EOOD' || t === 'ET';
    });

    if (slim.length === 0) {
      return new Response(JSON.stringify({ error: 'no eligible companies to push' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // Upsert by full_name
    const { data: existing } = await supabase
      .from('verified_owners')
      .select('id')
      .eq('full_name', full_name)
      .single();

    if (!existing?.id) {
      const { error: insErr } = await supabase
        .from('verified_owners')
        .insert({ full_name, companies_slim: slim })
        .select('id')
        .single();
      if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase
        .from('verified_owners')
        .update({ companies_slim: slim, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updErr) throw updErr;
    }

    return new Response(JSON.stringify({ status: 'ok', full_name, count: slim.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('owners_push_slim error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
