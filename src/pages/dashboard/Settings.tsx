import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "./ClientLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ClientSettings() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [org, setOrg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, org_id, organizations(name)").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setName(data?.full_name ?? "");
        // @ts-expect-error joined
        setOrg(data?.organizations?.name ?? null);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <ClientLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Profile</p>
        <h1 className="font-display text-3xl">Settings</h1>
      </header>

      <Card className="p-5 space-y-3 max-w-lg">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-1">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Organization</Label>
          <Input value={org ?? "— none —"} disabled />
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </Card>
    </ClientLayout>
  );
}
