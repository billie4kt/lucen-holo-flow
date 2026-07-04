import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import TelemetryPanel from "@/components/TelemetryPanel";
import { Link } from "react-router-dom";

export default function AdminOverview() {
  const [counts, setCounts] = useState({ subs: 0, orgs: 0, engagements: 0, newSubs: 0 });
  const [recent, setRecent] = useState<{ id: string; name: string; created_at: string; mode: string }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [subsAll, subsNew, orgs, eng, latest] = await Promise.all([
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }),
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("engagements").select("id", { count: "exact", head: true }),
        supabase.from("contact_submissions").select("id,name,created_at,mode").order("created_at", { ascending: false }).limit(6),
      ]);
      setCounts({
        subs: subsAll.count ?? 0,
        newSubs: subsNew.count ?? 0,
        orgs: orgs.count ?? 0,
        engagements: eng.count ?? 0,
      });
      setRecent(latest.data ?? []);
    })();
  }, []);

  const tiles = [
    { label: "Total submissions", v: counts.subs },
    { label: "New · 7d", v: counts.newSubs },
    { label: "Organizations", v: counts.orgs },
    { label: "Engagements", v: counts.engagements },
  ];

  return (
    <AdminLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Command deck</p>
        <h1 className="font-display text-3xl">Overview</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="font-display text-3xl mt-1 tabular-nums">{t.v}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl mb-3">Live telemetry</h2>
        <TelemetryPanel />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">Latest submissions</h2>
          <Link to="/admin/submissions" className="text-xs text-primary">Open triage →</Link>
        </div>
        <div className="space-y-2">
          {recent.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} · {r.mode}
                </p>
              </div>
              <Link to="/admin/submissions" className="text-xs text-primary">Open</Link>
            </Card>
          ))}
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
        </div>
      </section>
    </AdminLayout>
  );
}
