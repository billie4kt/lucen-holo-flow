import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "./ClientLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface Engagement {
  id: string; title: string; status: string; stage: string | null;
  next_step: string | null; industry_slug: string | null; created_at: string;
}

export default function ClientEngagements() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Engagement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("org_id").eq("id", user.id).maybeSingle();
      if (p?.org_id) {
        const { data } = await supabase.from("engagements").select("*").eq("org_id", p.org_id).order("created_at", { ascending: false });
        setRows((data ?? []) as Engagement[]);
      }
      setLoaded(true);
    })();
  }, [user]);

  return (
    <ClientLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Delivery</p>
        <h1 className="font-display text-3xl">Engagements</h1>
      </header>

      <div className="space-y-2">
        {rows.map((e) => (
          <Card key={e.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{e.title}</h3>
              <Badge variant={e.status === "active" ? "default" : "outline"}>{e.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Stage</p>
                <p>{e.stage ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Next step</p>
                <p>{e.next_step ?? "—"}</p>
              </div>
            </div>
            {e.industry_slug && <p className="text-[10px] font-mono text-muted-foreground">{e.industry_slug}</p>}
          </Card>
        ))}
        {loaded && rows.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground text-center">No engagements yet.</Card>
        )}
      </div>
    </ClientLayout>
  );
}
