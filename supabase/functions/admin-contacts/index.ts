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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
