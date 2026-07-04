import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "./ClientLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Sub {
  id: string; name: string; email: string | null; message: string | null;
  mode: string; status: string; created_at: string; industry: string | null;
}
interface Note {
  id: string; submission_id: string; body: string; visibility: string; created_at: string; author_id: string | null;
}

export default function ClientMessages() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Sub[]>([]);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("org_id").eq("id", user.id).maybeSingle();
      if (p?.org_id) {
        const { data } = await supabase.from("contact_submissions").select("*").eq("org_id", p.org_id).order("created_at", { ascending: false });
        setRows((data ?? []) as Sub[]);
      }
      setLoaded(true);
    })();
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    supabase.from("submission_notes").select("*").eq("submission_id", selected).order("created_at", { ascending: true })
      .then(({ data }) => setNotes((n) => ({ ...n, [selected]: (data ?? []) as Note[] })));
  }, [selected]);

  const send = async () => {
    if (!selected || !reply.trim() || !user) return;
    const { data, error } = await supabase
      .from("submission_notes")
      .insert({ submission_id: selected, body: reply.trim(), visibility: "client", author_id: user.id })
      .select().single();
    if (error) return toast.error(error.message);
    setNotes((n) => ({ ...n, [selected]: [...(n[selected] ?? []), data as Note] }));
    setReply("");
  };

  const sel = rows.find((r) => r.id === selected);

  return (
    <ClientLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Conversations</p>
        <h1 className="font-display text-3xl">Messages</h1>
      </header>

      <div className="grid md:grid-cols-[1fr_400px] gap-4">
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} onClick={() => setSelected(r.id)} className={`p-3 cursor-pointer ${selected === r.id ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.mode}</p>
                </div>
                <Badge variant={r.status === "resolved" ? "outline" : "default"} className="text-[10px]">{r.status}</Badge>
              </div>
            </Card>
          ))}
          {loaded && rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No messages yet.</Card>}
        </div>

        <div className="md:sticky md:top-6 h-fit">
          {sel ? (
            <Card className="p-4 space-y-3">
              <div>
                <h3 className="font-display text-lg">{sel.name}</h3>
                <p className="text-xs text-muted-foreground">{new Date(sel.created_at).toLocaleString()}</p>
              </div>
              {sel.message && <div className="border-l-2 border-primary/40 pl-3 text-sm whitespace-pre-wrap">{sel.message}</div>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(notes[sel.id] ?? []).map((n) => (
                  <div key={n.id} className={`text-sm rounded p-2 ${n.author_id === user?.id ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {(notes[sel.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">No replies yet.</p>}
              </div>
              <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to your team…" />
              <Button size="sm" onClick={send}>Send reply</Button>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">Select a message.</Card>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
