import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  org_id: string | null;
  created_at: string;
}
interface RoleRow { user_id: string; role: "admin" | "client" }
interface Org { id: string; name: string }

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);

  const load = async () => {
    const [p, r, o] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("organizations").select("id,name"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setOrgs((o.data ?? []) as Org[]);
  };
  useEffect(() => { load(); }, []);

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  const setRole = async (uid: string, role: "admin" | "client", add: boolean) => {
    if (add) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
    }
    load();
  };

  const assignOrg = async (uid: string, org_id: string | null) => {
    const { error } = await supabase.from("profiles").update({ org_id }).eq("id", uid);
    if (error) return toast.error(error.message);
    setProfiles((p) => p.map((x) => (x.id === uid ? { ...x, org_id } : x)));
  };

  return (
    <AdminLayout>
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Access</p>
        <h1 className="font-display text-3xl">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">New users are invited via the sign-up page; the first account is admin.</p>
      </header>

      <div className="space-y-2">
        {profiles.map((p) => {
          const rr = rolesFor(p.id);
          return (
            <Card key={p.id} className="p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium">{p.full_name ?? "Unnamed user"}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{p.id.slice(0, 8)}…</p>
              </div>
              <div className="flex gap-1">
                {(["admin", "client"] as const).map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={rr.includes(r) ? "default" : "outline"}
                    onClick={() => setRole(p.id, r, !rr.includes(r))}
                  >
                    {r}
                  </Button>
                ))}
              </div>
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={p.org_id ?? ""}
                onChange={(e) => assignOrg(p.id, e.target.value || null)}
              >
                <option value="">— no organization —</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Card>
          );
        })}
        {profiles.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
      </div>
    </AdminLayout>
  );
}
