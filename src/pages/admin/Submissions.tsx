import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";

interface Submission {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  mode: string;
  status: string;
  industry: string | null;
  use_case: string | null;
  company: string | null;
  tags: string[] | null;
  owner_id: string | null;
  org_id: string | null;
  created_at: string;
}

interface Note {
  id: string;
  submission_id: string;
  body: string;
  visibility: string;
  created_at: string;
  author_id: string | null;
}

const STATUSES = ["new", "in_progress", "resolved", "archived"];

export default function AdminSubmissions() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<{ status: string; industry: string; q: string }>({ status: "", industry: "", q: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteVis, setNoteVis] = useState<"internal" | "client">("internal");
  const [tagInput, setTagInput] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return toast.error(error.message);
    setRows(data as Submission[]);
  };

  useEffect(() => {
    load();
    supabase.from("organizations").select("id,name").then(({ data }) => setOrgs(data ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("submission_notes")
      .select("*")
      .eq("submission_id", selected)
      .order("created_at", { ascending: true })
      .then(({ data }) => setNotes((n) => ({ ...n, [selected]: (data ?? []) as Note[] })));
  }, [selected]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.industry && r.industry !== filter.industry) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !(r.email ?? "").toLowerCase().includes(q) &&
          !(r.message ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, filter]);

  const industries = useMemo(() => Array.from(new Set(rows.map((r) => r.industry).filter(Boolean))) as string[], [rows]);

  const update = async (id: string, patch: Partial<Submission>) => {
    const { error } = await supabase.from("contact_submissions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((s) => s.filter((r) => r.id !== id));
    if (selected === id) setSelected(null);
  };

  const addNote = async () => {
    if (!selected || !newNote.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("submission_notes")
      .insert({ submission_id: selected, body: newNote.trim(), visibility: noteVis, author_id: userRes.user?.id })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setNotes((n) => ({ ...n, [selected]: [...(n[selected] ?? []), data as Note] }));
    setNewNote("");
  };

  const addTag = async (id: string) => {
    const tag = tagInput.trim();
    if (!tag) return;
    const row = rows.find((r) => r.id === id);
    const next = Array.from(new Set([...(row?.tags ?? []), tag]));
    await update(id, { tags: next });
    setTagInput("");
  };

  const removeTag = async (id: string, tag: string) => {
    const row = rows.find((r) => r.id === id);
    const next = (row?.tags ?? []).filter((t) => t !== tag);
    await update(id, { tags: next });
  };

  const sel = rows.find((r) => r.id === selected);

  return (
    <AdminLayout>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Triage</p>
          <h1 className="font-display text-3xl">Submissions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search…" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} className="w-48" />
          <select className="text-sm border rounded px-2 bg-background" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="text-sm border rounded px-2 bg-background" value={filter.industry} onChange={(e) => setFilter((f) => ({ ...f, industry: e.target.value }))}>
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_400px] gap-4">
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={`p-3 cursor-pointer transition-colors ${selected === r.id ? "border-primary" : ""}`}
              onClick={() => setSelected(r.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name} {r.company && <span className="text-muted-foreground text-xs">· {r.company}</span>}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.mode}</p>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {r.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={r.status === "new" ? "default" : "outline"} className="text-[10px]">{r.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No matches.</p>}
        </div>

        <div className="md:sticky md:top-6 h-fit">
          {sel ? (
            <Card className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg">{sel.name}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(sel.created_at).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(sel.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {sel.email && <div className="col-span-2"><span className="text-muted-foreground">Email:</span> <a className="underline" href={`mailto:${sel.email}`}>{sel.email}</a></div>}
                {sel.phone && <div><span className="text-muted-foreground">Phone:</span> {sel.phone}</div>}
                {sel.company && <div><span className="text-muted-foreground">Company:</span> {sel.company}</div>}
                {sel.industry && <div><span className="text-muted-foreground">Industry:</span> {sel.industry}</div>}
                {sel.use_case && <div><span className="text-muted-foreground">Use case:</span> {sel.use_case}</div>}
              </div>

              {sel.message && (
                <div className="border-l-2 border-primary/40 pl-3 text-sm whitespace-pre-wrap">{sel.message}</div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
                <select className="w-full text-sm border rounded px-2 py-1 bg-background" value={sel.status} onChange={(e) => update(sel.id, { status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Assign to organization</label>
                <select className="w-full text-sm border rounded px-2 py-1 bg-background" value={sel.org_id ?? ""} onChange={(e) => update(sel.id, { org_id: e.target.value || null })}>
                  <option value="">— unassigned —</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</label>
                <div className="flex gap-1 flex-wrap">
                  {(sel.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => removeTag(sel.id, t)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === "Enter" && addTag(sel.id)} />
                  <Button size="icon" variant="outline" onClick={() => addTag(sel.id)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(notes[sel.id] ?? []).map((n) => (
                    <div key={n.id} className="text-sm border-l-2 border-muted pl-2">
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()} · {n.visibility}</p>
                    </div>
                  ))}
                  {(notes[sel.id] ?? []).length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                </div>
                <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" rows={2} />
                <div className="flex items-center gap-2">
                  <select className="text-xs border rounded px-2 py-1 bg-background" value={noteVis} onChange={(e) => setNoteVis(e.target.value as "internal" | "client")}>
                    <option value="internal">Internal</option>
                    <option value="client">Visible to client</option>
                  </select>
                  <Button size="sm" onClick={addNote}>Add note</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-muted-foreground text-sm">Select a submission to triage.</Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
