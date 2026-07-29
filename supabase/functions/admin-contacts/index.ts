import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { password, action, id, status, limit, offset, days } = await req.json();
    const expected = Deno.env.get("ADMIN_PASSWORD");
    if (!expected || password !== expected) {
      return json({ error: "Invalid password" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;

    const logAction = async (act: string, targetId: string | null, details: unknown) => {
      await supabase.from("admin_audit_log").insert({
        action: act,
        target_id: targetId,
        details: details as object,
        ip,
      });
    };

    if (action === "list") {
      const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
      const off = Math.max(Number(offset) || 0, 0);
      const { data, error, count } = await supabase
        .from("contact_submissions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(off, off + lim - 1);
      if (error) return json({ error: error.message }, 500);
      await logAction("list", null, { limit: lim, offset: off, returned: data?.length ?? 0 });
      return json({ submissions: data, total: count ?? 0 });
    }

    if (action === "updateStatus") {
      if (!id || !status) return json({ error: "Missing id or status" }, 400);
      const { error } = await supabase
        .from("contact_submissions")
        .update({ status })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await logAction("updateStatus", id, { status });
      return json({ ok: true });
    }

    if (action === "delete") {
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await logAction("delete", id, null);
      return json({ ok: true });
    }

    if (action === "auditLog") {
      const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
      const off = Math.max(Number(offset) || 0, 0);
      const { data, error, count } = await supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(off, off + lim - 1);
      if (error) return json({ error: error.message }, 500);
      return json({ logs: data, total: count ?? 0 });
    }

    if (action === "analytics") {
      const d = Math.min(Math.max(Number(days) || 1, 1), 400);
      const since = new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();

      const [evts, subs] = await Promise.all([
        supabase
          .from("engine_events")
          .select("event_type, path, session_id, referrer, integration_slug, metadata, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase
          .from("contact_submissions")
          .select("id, name, mode, status, country, industry, use_case, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);

      if (evts.error) return json({ error: evts.error.message }, 500);
      if (subs.error) return json({ error: subs.error.message }, 500);

      return json({ events: evts.data ?? [], submissions: subs.data ?? [], since, days: d });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
