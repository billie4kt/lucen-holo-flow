import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, LogOut } from "lucide-react";
import TelemetryPanel from "@/components/TelemetryPanel";

interface Submission {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  mode: string;
  preferred_time: string | null;
  status: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

const STATUSES = ["new", "in_progress", "resolved", "archived"];
const PAGE_SIZE = 20;

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem("admin_pw") || "");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"telemetry" | "submissions" | "audit">("telemetry");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-contacts", { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadPage = useCallback(
    async (pw: string, offset: number, replace: boolean) => {
      const data = await call({ password: pw, action: "list", limit: PAGE_SIZE, offset });
      setTotal(data.total || 0);
      setSubmissions((prev) => (replace ? data.submissions : [...prev, ...(data.submissions || [])]));
    },
    [],
  );

  const loadLogs = useCallback(async (pw: string) => {
    const data = await call({ password: pw, action: "auditLog", limit: 100, offset: 0 });
    setLogs(data.logs || []);
    setLogsTotal(data.total || 0);
  }, []);

  const initialLoad = async (pw = password) => {
    setLoading(true);
    try {
      await loadPage(pw, 0, true);
      setAuthed(true);
      sessionStorage.setItem("admin_pw", pw);
    } catch (e) {
      toast({ title: "Login failed", description: (e as Error).message, variant: "destructive" });
      setAuthed(false);
      sessionStorage.removeItem("admin_pw");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password) initialLoad(password);
    document.title = "Admin · Contact Submissions";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (tab !== "submissions" || !authed) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loadingMore || loading) return;
        if (submissions.length >= total) return;
        setLoadingMore(true);
        try {
          await loadPage(password, submissions.length, false);
        } catch (e) {
          toast({ title: "Load failed", description: (e as Error).message, variant: "destructive" });
        } finally {
          setLoadingMore(false);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, authed, submissions.length, total, loading, loadingMore, password, loadPage]);

  useEffect(() => {
    if (tab === "audit" && authed) {
      loadLogs(password).catch((e) =>
        toast({ title: "Load failed", description: (e as Error).message, variant: "destructive" }),
      );
    }
  }, [tab, authed, password, loadLogs]);

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === "submissions") await loadPage(password, 0, true);
      else await loadLogs(password);
    } catch (e) {
      toast({ title: "Refresh failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await call({ password, action: "updateStatus", id, status });
      setSubmissions((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await call({ password, action: "delete", id });
      setSubmissions((s) => s.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin_pw");
    setPassword("");
    setAuthed(false);
    setSubmissions([]);
    setLogs([]);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Enter the admin password to continue.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              initialLoad(password);
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {tab === "submissions"
                ? `${submissions.length} of ${total} submissions loaded`
                : tab === "audit"
                  ? `${logs.length} of ${logsTotal} audit entries`
                  : "Live site & visitor telemetry"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="flex gap-2 border-b overflow-x-auto">
          {(["telemetry", "submissions", "audit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "telemetry" ? "Site Telemetry" : t === "submissions" ? "Submissions" : "Audit Log"}
            </button>
          ))}
        </div>

        {tab === "telemetry" && <TelemetryPanel />}


        {tab === "submissions" && (
          <div className="space-y-3">
            {submissions.length === 0 && !loading && (
              <Card className="p-8 text-center text-muted-foreground">No submissions.</Card>
            )}
            {submissions.map((s) => (
              <Card key={s.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()} · mode: {s.mode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs border rounded px-2 py-1 bg-background"
                      value={s.status}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {s.email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <a className="underline" href={`mailto:${s.email}`}>
                        {s.email}
                      </a>
                    </div>
                  )}
                  {s.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      <a className="underline" href={`tel:${s.phone}`}>
                        {s.phone}
                      </a>
                    </div>
                  )}
                  {s.preferred_time && (
                    <div>
                      <span className="text-muted-foreground">Preferred time:</span> {s.preferred_time}
                    </div>
                  )}
                </div>
                {s.message && (
                  <p className="text-sm whitespace-pre-wrap border-l-2 border-primary/40 pl-3 mt-2">{s.message}</p>
                )}
              </Card>
            ))}
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-xs text-muted-foreground">
              {loadingMore
                ? "Loading more…"
                : submissions.length >= total && submissions.length > 0
                  ? "End of list"
                  : ""}
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-2">
            {logs.length === 0 && !loading && (
              <Card className="p-8 text-center text-muted-foreground">No audit entries.</Card>
            )}
            {logs.map((l) => (
              <Card key={l.id} className="p-3 text-sm flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums w-44">
                  {new Date(l.created_at).toLocaleString()}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{l.action}</span>
                {l.target_id && (
                  <span className="text-xs text-muted-foreground font-mono">
                    target: {l.target_id.slice(0, 8)}…
                  </span>
                )}
                {l.details && (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {JSON.stringify(l.details)}
                  </span>
                )}
                {l.ip && <span className="text-xs text-muted-foreground">{l.ip}</span>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
