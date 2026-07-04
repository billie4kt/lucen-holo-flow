import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { industries } from "@/data/industries";
import { useCases } from "@/data/usecases";

interface FileObj {
  name: string;
  id?: string;
  updated_at?: string;
  metadata?: { size?: number; mimetype?: string };
}

export default function AdminContent() {
  const [tab, setTab] = useState<"media" | "industries" | "usecases">("media");
  const [files, setFiles] = useState<FileObj[]>([]);
  const [prefix] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.storage.from("media").list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) return toast.error(error.message);
    setFiles((data ?? []) as FileObj[]);
  }, [prefix]);

  useEffect(() => { load(); }, [load]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const path = `${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("media").upload(path, f, { upsert: false });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Uploaded");
    load();
  };

  const remove = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.storage.from("media").remove([name]);
    if (error) return toast.error(error.message);
    setFiles((f) => f.filter((x) => x.name !== name));
  };

  const publicUrl = (name: string) =>
    supabase.storage.from("media").getPublicUrl(name).data.publicUrl;

  return (
    <AdminLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Content</p>
        <h1 className="font-display text-3xl">Content & Media</h1>
      </header>

      <div className="flex gap-2 border-b">
        {(["media", "industries", "usecases"] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "media" && (
        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Upload asset</p>
              <p className="text-xs text-muted-foreground">Goes into the public <code>media</code> bucket.</p>
            </div>
            <label className="cursor-pointer">
              <input type="file" hidden onChange={onUpload} disabled={uploading} />
              <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded text-sm">
                <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Choose file"}
              </span>
            </label>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {files.map((f) => {
              const url = publicUrl(f.name);
              const mt = f.metadata?.mimetype ?? "";
              return (
                <Card key={f.name} className="p-2 space-y-2 group">
                  <div className="aspect-square bg-muted rounded overflow-hidden flex items-center justify-center">
                    {mt.startsWith("image") ? (
                      <img src={url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : mt.startsWith("video") ? (
                      <video src={url} className="w-full h-full object-cover" muted />
                    ) : (
                      <span className="text-xs text-muted-foreground p-2 text-center break-all">{f.name}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] truncate flex-1" title={f.name}>{f.name}</p>
                    <Button variant="ghost" size="icon" onClick={() => remove(f.name)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "industries" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Industries are code-defined in <code>src/data/industries.ts</code>. Editing them here is view-only for now; ask an editor to update the file.</p>
          <div className="grid md:grid-cols-2 gap-2">
            {industries.map((i) => (
              <Card key={i.slug} className="p-3">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground truncate">{i.tagline}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">/industries/{i.slug}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "usecases" && (
        <div className="grid md:grid-cols-2 gap-2">
          {useCases.map((u) => (
            <Card key={u.slug} className="p-3">
              <p className="font-medium">{u.title}</p>
              <p className="text-xs text-muted-foreground truncate">{u.tagline}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">/use-cases/{u.slug}</p>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
