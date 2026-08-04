import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Clock, Gauge, MessageSquare, MousePointerClick, Users } from 'lucide-react';

type EventRow = {
  event_type: string;
  path: string | null;
  session_id: string | null;
  referrer: string | null;
  integration_slug: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  name: string;
  mode: string;
  status: string;
  country: string | null;
  industry: string | null;
  use_case: string | null;
  created_at: string;
};

const PERIODS = [
  { key: 'daily', label: 'Daily', days: 1, bucket: 'hour' },
  { key: 'weekly', label: 'Weekly', days: 7, bucket: 'day' },
  { key: 'monthly', label: 'Monthly', days: 30, bucket: 'day' },
  { key: 'quarterly', label: 'Quarterly', days: 90, bucket: 'week' },
  { key: 'semiannual', label: 'Semi-annual', days: 180, bucket: 'week' },
  { key: 'annual', label: 'Annual', days: 365, bucket: 'month' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', 'hsl(var(--ring))', 'hsl(var(--secondary))'];

function meta(row: EventRow, key: string): string {
  const v = row.metadata?.[key];
  return typeof v === 'string' && v.length ? v : 'Unknown';
}

function bucketKey(d: Date, bucket: string): string {
  if (bucket === 'hour') return `${String(d.getHours()).padStart(2, '0')}:00`;
  if (bucket === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  if (bucket === 'week') {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

function fmtDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AnalyticsDashboard({
  fetchAnalytics,
}: {
  fetchAnalytics: (days: number) => Promise<{ events: EventRow[]; submissions: SubmissionRow[] }>;
}) {
  const [period, setPeriod] = useState<PeriodKey>('weekly');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cfg = PERIODS.find((p) => p.key === period)!;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAnalytics(cfg.days)
      .then((d) => {
        if (cancelled) return;
        setEvents(d.events || []);
        setSubmissions(d.submissions || []);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cfg.days, fetchAnalytics]);

  const agg = useMemo(() => {
    const series = new Map<string, { views: number; sessions: Set<string>; conversions: number }>();
    const devices = new Map<string, number>();
    const os = new Map<string, number>();
    const browsers = new Map<string, number>();
    const countries = new Map<string, number>();
    const platforms = new Map<string, number>();
    const hosts = new Map<string, number>();
    const referrers = new Map<string, number>();
    const pages = new Map<string, { views: number; dwellTotal: number; dwellCount: number }>();
    const sessions = new Set<string>();
    let views = 0;
    let ctas = 0;
    let conversions = 0;
    let dwellTotal = 0;
    let dwellCount = 0;

    for (const e of events) {
      const d = new Date(e.created_at);
      const k = bucketKey(d, cfg.bucket);
      if (!series.has(k)) series.set(k, { views: 0, sessions: new Set(), conversions: 0 });
      const s = series.get(k)!;
      if (e.session_id) {
        sessions.add(e.session_id);
        s.sessions.add(e.session_id);
      }

      const path = e.path || '/';
      if (!pages.has(path)) pages.set(path, { views: 0, dwellTotal: 0, dwellCount: 0 });
      const p = pages.get(path)!;

      if (e.event_type === 'page_view') {
        views++;
        s.views++;
        p.views++;
        devices.set(meta(e, 'device'), (devices.get(meta(e, 'device')) ?? 0) + 1);
        os.set(meta(e, 'os'), (os.get(meta(e, 'os')) ?? 0) + 1);
        browsers.set(meta(e, 'browser'), (browsers.get(meta(e, 'browser')) ?? 0) + 1);
        countries.set(meta(e, 'country'), (countries.get(meta(e, 'country')) ?? 0) + 1);
        platforms.set(meta(e, 'platform'), (platforms.get(meta(e, 'platform')) ?? 0) + 1);
        hosts.set(meta(e, 'host'), (hosts.get(meta(e, 'host')) ?? 0) + 1);
        let ref = 'Direct';
        try {
          if (e.referrer) ref = new URL(e.referrer).hostname;
        } catch { /* noop */ }
        referrers.set(ref, (referrers.get(ref) ?? 0) + 1);
      }
      if (e.event_type === 'cta_click') ctas++;
      if (e.event_type === 'conversion') {
        conversions++;
        s.conversions++;
      }
      if (e.event_type === 'page_exit') {
        const ms = Number(e.metadata?.dwell_ms ?? 0);
        if (ms > 0 && ms < 3 * 3600 * 1000) {
          dwellTotal += ms;
          dwellCount++;
          p.dwellTotal += ms;
          p.dwellCount++;
        }
      }
    }

    const chart = [...series.entries()]
      .map(([name, v]) => ({ name, views: v.views, sessions: v.sessions.size, conversions: v.conversions }))
      .reverse();

    const topPages = [...pages.entries()]
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 10)
      .map(([path, v]) => ({
        path,
        views: v.views,
        avgTime: v.dwellCount ? v.dwellTotal / v.dwellCount / 1000 : 0,
      }));

    return {
      views,
      ctas,
      conversions,
      sessions: sessions.size,
      avgTime: dwellCount ? dwellTotal / dwellCount / 1000 : 0,
      chart,
      devices: topN(devices, 5),
      os: topN(os, 6),
      browsers: topN(browsers, 6),
      countries: topN(countries, 8),
      platforms: topN(platforms, 8),
      hosts: topN(hosts, 8),
      referrers: topN(referrers, 6),
      topPages,
    };
  }, [events, cfg.bucket]);

  const convRate = agg.sessions ? ((agg.conversions / agg.sessions) * 100).toFixed(1) : '0.0';

  const tiles = [
    { icon: Users, label: 'Unique visitors', value: agg.sessions.toLocaleString() },
    { icon: Activity, label: 'Page views', value: agg.views.toLocaleString() },
    { icon: MousePointerClick, label: 'CTA clicks', value: agg.ctas.toLocaleString() },
    { icon: Gauge, label: 'Conversions', value: `${agg.conversions.toLocaleString()} · ${convRate}%` },
    { icon: Clock, label: 'Avg. time on page', value: fmtDuration(agg.avgTime) },
    { icon: MessageSquare, label: 'Submissions', value: submissions.length.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={p.key === period ? 'default' : 'outline'}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {error && <Card className="p-4 text-sm text-destructive">Failed to load analytics: {error}</Card>}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider">
              <t.icon className="h-3.5 w-3.5 shrink-0" /> {t.label}
            </div>
            <p className="font-display text-2xl font-semibold tabular-nums">{loading ? '…' : t.value}</p>
          </Card>
        ))}
      </div>

      {/* Traffic over time */}
      <Card className="p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Traffic · {cfg.label.toLowerCase()} view
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={agg.chart}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Device / OS / Country */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Device type</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={agg.devices} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {agg.devices.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {agg.devices.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Operating system</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agg.os} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1 text-xs">
            {agg.browsers.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-muted-foreground">
                <span>{b.name}</span>
                <span className="tabular-nums">{b.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Location</p>
          <div className="space-y-2">
            {agg.countries.map((c) => {
              const max = agg.countries[0]?.value || 1;
              return (
                <div key={c.name} className="flex items-center gap-3 text-sm">
                  <span className="w-24 truncate text-xs text-muted-foreground">{c.name}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(c.value / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-xs">{c.value}</span>
                </div>
              );
            })}
            {agg.countries.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-5 mb-2">Referrers</p>
          <div className="space-y-1 text-xs">
            {agg.referrers.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-muted-foreground">
                <span className="truncate">{r.name}</span>
                <span className="tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pages */}
      <Card className="p-4 overflow-x-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Pages · views & time spent</p>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-xs text-muted-foreground text-left">
              <th className="pb-2 font-medium">Path</th>
              <th className="pb-2 font-medium text-right">Views</th>
              <th className="pb-2 font-medium text-right">Avg. time</th>
              <th className="pb-2 font-medium w-1/3">Share</th>
            </tr>
          </thead>
          <tbody>
            {agg.topPages.map((p) => {
              const max = agg.topPages[0]?.views || 1;
              return (
                <tr key={p.path} className="border-t border-border/60">
                  <td className="py-2 font-mono text-xs truncate max-w-[220px]">{p.path}</td>
                  <td className="py-2 text-right tabular-nums">{p.views}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtDuration(p.avgTime)}</td>
                  <td className="py-2 pl-3">
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(p.views / max) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {agg.topPages.length === 0 && <p className="text-sm text-muted-foreground">No page views captured for this period.</p>}
      </Card>

      {/* Submissions breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Submissions by type</p>
          <div className="space-y-2 text-sm">
            {topN(
              submissions.reduce((m, s) => m.set(s.mode || 'message', (m.get(s.mode || 'message') ?? 0) + 1), new Map<string, number>()),
              6,
            ).map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span>{m.name}</span>
                <span className="tabular-nums text-muted-foreground">{m.value}</span>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-muted-foreground">No submissions in this period.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Submissions by status</p>
          <div className="space-y-2 text-sm">
            {topN(
              submissions.reduce((m, s) => m.set(s.status || 'new', (m.get(s.status || 'new') ?? 0) + 1), new Map<string, number>()),
              6,
            ).map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span>{m.name}</span>
                <span className="tabular-nums text-muted-foreground">{m.value}</span>
              </div>
            ))}
            {submissions.length === 0 && <p className="text-muted-foreground">No submissions in this period.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
