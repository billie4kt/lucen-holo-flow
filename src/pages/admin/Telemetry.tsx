import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import TelemetryPanel from "@/components/TelemetryPanel";

interface Ev {
  id: string;
  event_type: string;
  path: string | null;
  session_id: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminTelemetry() {
  const [stream, setStream] = useState<Ev[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("engine_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setStream((data ?? []) as Ev[]);
    };
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <AdminLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Signals</p>
        <h1 className="font-display text-3xl">Telemetry deep-dive</h1>
      </header>

      <TelemetryPanel />

      <Card className="p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Live event stream · last 50</p>
        <div className="space-y-1 max-h-[500px] overflow-y-auto font-mono text-xs">
          {stream.map((e) => (
            <div key={e.id} className="grid grid-cols-[110px_120px_1fr_120px] gap-2 py-1 border-b border-border/40">
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
              <span className="text-primary">{e.event_type}</span>
              <span className="truncate">{e.path ?? "—"}</span>
              <span className="text-muted-foreground truncate">{e.session_id?.slice(0, 8) ?? "—"}</span>
            </div>
          ))}
          {stream.length === 0 && <p className="text-muted-foreground">No events captured yet.</p>}
        </div>
      </Card>
    </AdminLayout>
  );
}
