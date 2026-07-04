import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "./ClientLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function ClientOverview() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null; org_id: string | null } | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [counts, setCounts] = useState({ engagements: 0, submissions: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, org_id").eq("id", user.id).maybeSingle();
      setProfile(p);
      if (p?.org_id) {
        const [{ data: org }, { count: ec }, { count: sc }] = await Promise.all([
          supabase.from("organizations").select("name").eq("id", p.org_id).maybeSingle(),
          supabase.from("engagements").select("id", { count: "exact", head: true }).eq("org_id", p.org_id),
          supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("org_id", p.org_id),
        ]);
        setOrgName(org?.name ?? null);
        setCounts({ engagements: ec ?? 0, submissions: sc ?? 0 });
      }
    })();
  }, [user]);

  return (
    <ClientLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Workspace</p>
        <h1 className="font-display text-3xl">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-muted-foreground">{orgName ?? "No organization assigned yet — an admin will link you shortly."}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Active engagements</p>
          <p className="font-display text-3xl mt-1 tabular-nums">{counts.engagements}</p>
          <Link to="/dashboard/engagements" className="text-xs text-primary mt-2 inline-block">View →</Link>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Messages</p>
          <p className="font-display text-3xl mt-1 tabular-nums">{counts.submissions}</p>
          <Link to="/dashboard/messages" className="text-xs text-primary mt-2 inline-block">View →</Link>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Analytics</p>
          <p className="text-sm mt-1 text-muted-foreground">Live campaign telemetry</p>
          <Link to="/dashboard/analytics" className="text-xs text-primary mt-2 inline-block">Open →</Link>
        </Card>
      </div>

      {!profile?.org_id && (
        <Card className="p-6 text-sm text-muted-foreground">
          Your workspace hasn't been linked to an organization yet. Once an admin assigns you, engagements and analytics will populate here.
        </Card>
      )}
    </ClientLayout>
  );
}
