import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { industries } from "@/data/industries";

interface Org { id: string; name: string; slug: string; industry: string | null; created_at: string }
interface Engagement {
  id: string; org_id: string; title: string; status: string;
  industry_slug: string | null; use_case_slug: string | null;
  stage: string | null; next_step: string | null;
  starts_at: string | null; created_at: string;
}

export default function AdminOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [eng, setEng] = useState<Engagement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "", industry: "" });
  const [newEng, setNewEng] = useState({ title: "", industry_slug: "", stage: "discovery", next_step: "" });

  const load = async () => {
    const [o, e] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("engagements").select("*").order("created_at", { ascending: false }),
    ]);
    setOrgs((o.data ?? []) as Org[]);
    setEng((e.data ?? []) as Engagement[]);
  };
  useEffect(() => { load(); }, []);

  const createOrg = async () => {
    if (!newOrg.name || !newOrg.slug) return toast.error("Name and slug required");
    const { error } = await supabase.from("organizations").insert(newOrg);
    if (error) return toast.error(error.message);
    setNewOrg({ name: "", slug: "", industry: "" });
    load();
  };
  const removeOrg = async (id: string) => {
    if (!confirm("Delete organization? Its engagements will be removed too.")) return;
    const { error } = await supabase.from("organizations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const createEng = async () => {
    if (!selected || !newEng.title) return;
    const { error } = await supabase.from("engagements").insert({ ...newEng, org_id: selected });
    if (error) return toast.error(error.message);
    setNewEng({ title: "", industry_slug: "", stage: "discovery", next_step: "" });
    load();
  };
  const updateEng = async (id: string, patch: Partial<Engagement>) => {
    const { error } = await supabase.from("engagements").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setEng((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const currentOrg = orgs.find((o) => o.id === selected);
  const orgEng = eng.filter((e) => e.org_id === selected);

  return (
    <AdminLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Workspaces</p>
        <h1 className="font-display text-3xl">Organizations</h1>
      </header>

      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <div className="space-y-3">
          <Card className="p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">New organization</p>
            <Input placeholder="Name" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} />
            <Input placeholder="slug" value={newOrg.slug} onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            <select className="w-full text-sm border rounded px-2 py-1.5 bg-background" value={newOrg.industry} onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}>
              <option value="">— industry —</option>
              {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
            <Button size="sm" className="w-full" onClick={createOrg}><Plus className="h-4 w-4" /> Create</Button>
          </Card>
          <div className="space-y-1">
            {orgs.map((o) => (
              <Card
                key={o.id}
                onClick={() => setSelected(o.id)}
                className={`p-3 cursor-pointer ${selected === o.id ? "border-primary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.slug} · {o.industry ?? "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeOrg(o.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {currentOrg ? (
            <>
              <Card className="p-4">
                <h2 className="font-display text-xl">{currentOrg.name}</h2>
                <p className="text-xs text-muted-foreground">{currentOrg.slug} · created {new Date(currentOrg.created_at).toLocaleDateString()}</p>
              </Card>

              <Card className="p-3 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">New engagement</p>
                <Input placeholder="Title" value={newEng.title} onChange={(e) => setNewEng({ ...newEng, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="text-sm border rounded px-2 py-1.5 bg-background" value={newEng.industry_slug} onChange={(e) => setNewEng({ ...newEng, industry_slug: e.target.value })}>
                    <option value="">— industry —</option>
                    {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                  </select>
                  <Input placeholder="Stage" value={newEng.stage} onChange={(e) => setNewEng({ ...newEng, stage: e.target.value })} />
                </div>
                <Input placeholder="Next step" value={newEng.next_step} onChange={(e) => setNewEng({ ...newEng, next_step: e.target.value })} />
                <Button size="sm" onClick={createEng}><Plus className="h-4 w-4" /> Add engagement</Button>
              </Card>

              <div className="space-y-2">
                {orgEng.map((e) => (
                  <Card key={e.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input value={e.title} onChange={(ev) => updateEng(e.id, { title: ev.target.value })} className="font-medium" />
                      <select className="text-xs border rounded px-2 py-1 bg-background" value={e.status} onChange={(ev) => updateEng(e.id, { status: ev.target.value })}>
                        {["active", "paused", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Stage" value={e.stage ?? ""} onChange={(ev) => updateEng(e.id, { stage: ev.target.value })} />
                      <Input placeholder="Next step" value={e.next_step ?? ""} onChange={(ev) => updateEng(e.id, { next_step: ev.target.value })} />
                    </div>
                  </Card>
                ))}
                {orgEng.length === 0 && <p className="text-sm text-muted-foreground">No engagements yet.</p>}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">Select an organization to manage engagements.</Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
