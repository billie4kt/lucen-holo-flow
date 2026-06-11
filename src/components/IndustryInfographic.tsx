import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import HolographicCanvas from './HolographicCanvas';

interface Metric { value: string; label: string }
interface Props {
  industryName: string;
  industrySlug?: string;
  metrics: Metric[];
}

/** Deterministic hash → 0..1 for per-industry seeding */
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Find a metric whose label matches any keyword; return parsed number */
function pickMetric(metrics: Metric[], keywords: string[]): number | null {
  for (const m of metrics) {
    const l = m.label.toLowerCase();
    if (keywords.some((k) => l.includes(k))) {
      const n = parseFloat(m.value.replace(/[^\d.\-]/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** Industry-tailored visual + telemetry profile */
interface IndustryStream { label: string; suffix: string; max: number; seed: number; volatility: number }
interface IndustryProfile {
  hue: number; density: number; intensity: number;
  streams: IndustryStream[];
  unit?: string; // label for sessions counter
}
const DEFAULT_PROFILE: IndustryProfile = {
  hue: 195, density: 160, intensity: 0.85,
  streams: [
    { label: 'Footfall index', suffix: '', max: 200, seed: 120, volatility: 6 },
    { label: 'Brand lift', suffix: '%', max: 60, seed: 28, volatility: 2 },
    { label: 'Share-of-attention', suffix: '%', max: 100, seed: 64, volatility: 4 },
  ],
};
const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  'retail-luxury': { hue: 320, density: 200, intensity: 1, streams: [
    { label: 'Window dwell', suffix: 's', max: 30, seed: 12, volatility: 1.2 },
    { label: 'Basket lift', suffix: '%', max: 40, seed: 18, volatility: 1.5 },
    { label: 'Try-on intent', suffix: '%', max: 100, seed: 54, volatility: 4 },
  ]},
  'real-estate': { hue: 28, density: 180, intensity: 0.95, streams: [
    { label: 'Tour completion', suffix: '%', max: 100, seed: 72, volatility: 3 },
    { label: 'Deposit intent', suffix: '%', max: 60, seed: 22, volatility: 2 },
    { label: 'Unit recall', suffix: '%', max: 100, seed: 88, volatility: 2.5 },
  ]},
  telecom: { hue: 205, density: 240, intensity: 1, streams: [
    { label: 'Subscriber lift', suffix: '%', max: 40, seed: 14, volatility: 1.4 },
    { label: 'ARPU delta', suffix: '%', max: 25, seed: 8, volatility: 1 },
    { label: 'Plan upgrade rate', suffix: '%', max: 30, seed: 11, volatility: 1.2 },
  ]},
  automotive: { hue: 14, density: 220, intensity: 1, streams: [
    { label: 'Configurator opens', suffix: '/min', max: 50, seed: 22, volatility: 2.4 },
    { label: 'Test-drive intent', suffix: '%', max: 60, seed: 27, volatility: 2 },
    { label: 'Spec-up conversion', suffix: '%', max: 30, seed: 9, volatility: 1.2 },
  ]},
  banking: { hue: 165, density: 180, intensity: 0.9, streams: [
    { label: 'Branch dwell', suffix: 's', max: 60, seed: 28, volatility: 2 },
    { label: 'Product enquiries', suffix: '/h', max: 120, seed: 64, volatility: 4 },
    { label: 'App install lift', suffix: '%', max: 40, seed: 16, volatility: 1.4 },
  ]},
  hospitality: { hue: 38, density: 180, intensity: 0.9, streams: [
    { label: 'Concierge engages', suffix: '/h', max: 80, seed: 38, volatility: 3 },
    { label: 'Upsell take-rate', suffix: '%', max: 35, seed: 14, volatility: 1.2 },
    { label: 'Stay-extension intent', suffix: '%', max: 25, seed: 9, volatility: 0.9 },
  ]},
  entertainment: { hue: 280, density: 260, intensity: 1, streams: [
    { label: 'Crowd capture', suffix: '%', max: 100, seed: 78, volatility: 3 },
    { label: 'Social shares', suffix: '/min', max: 80, seed: 28, volatility: 3 },
    { label: 'Encore intent', suffix: '%', max: 60, seed: 36, volatility: 2 },
  ]},
  healthcare: { hue: 175, density: 150, intensity: 0.8, streams: [
    { label: 'Wayfinding success', suffix: '%', max: 100, seed: 86, volatility: 2 },
    { label: 'Education recall', suffix: '%', max: 100, seed: 64, volatility: 2.5 },
    { label: 'Anxiety drop', suffix: '%', max: 40, seed: 18, volatility: 1.4 },
  ]},
  education: { hue: 210, density: 180, intensity: 0.9, streams: [
    { label: 'Lesson recall', suffix: '%', max: 100, seed: 78, volatility: 2 },
    { label: 'Hands-on time', suffix: 'm', max: 30, seed: 14, volatility: 1 },
    { label: 'Participation', suffix: '%', max: 100, seed: 72, volatility: 3 },
  ]},
  government: { hue: 220, density: 160, intensity: 0.85, streams: [
    { label: 'Citizen engagement', suffix: '%', max: 100, seed: 58, volatility: 2 },
    { label: 'Info recall', suffix: '%', max: 100, seed: 64, volatility: 2.5 },
    { label: 'Service throughput', suffix: '/h', max: 200, seed: 96, volatility: 6 },
  ]},
  aviation: { hue: 200, density: 220, intensity: 1, streams: [
    { label: 'Gate dwell', suffix: 's', max: 90, seed: 42, volatility: 3 },
    { label: 'Duty-free uplift', suffix: '%', max: 35, seed: 14, volatility: 1.2 },
    { label: 'Loyalty sign-ups', suffix: '/h', max: 60, seed: 22, volatility: 2 },
  ]},
  events: { hue: 295, density: 260, intensity: 1, streams: [
    { label: 'Stage capture', suffix: '%', max: 100, seed: 84, volatility: 3 },
    { label: 'Sponsor recall', suffix: '%', max: 100, seed: 62, volatility: 2.5 },
    { label: 'Post-event reach', suffix: 'k', max: 500, seed: 180, volatility: 14 },
  ]},
};
function getProfile(slug?: string): IndustryProfile {
  if (!slug) return DEFAULT_PROFILE;
  return INDUSTRY_PROFILES[slug] ?? DEFAULT_PROFILE;
}

function parseNumber(v: string): { num: number; prefix: string; suffix: string } | null {
  const m = v.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseFloat(m[2]), suffix: m[3] };
}

function Counter({ target, prefix, suffix }: { target: number; prefix: string; suffix: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30%' });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);
  const display = Math.abs(target) < 10 && target % 1 !== 0
    ? val.toFixed(1)
    : Math.round(val).toString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

/**
 * Live, animated infographic for an industry. Pairs a holographic canvas
 * backdrop with counting metrics + animated bars driven by Lucen Engine telemetry.
 */
export default function IndustryInfographic({ industryName, industrySlug, metrics }: Props) {
  // Seed live telemetry from this industry's own metrics so each page is unique.
  const seedKey = industrySlug ?? industryName;
  const jitter = hash01(seedKey); // 0..1
  const profile = getProfile(industrySlug);

  const attentionSeed = pickMetric(metrics, ['attention', 'engagement', 'recall', 'dwell']) ?? (55 + jitter * 35);
  const dwellSeed = pickMetric(metrics, ['dwell', 'time', 'duration']) ?? (8 + jitter * 22);
  const conversionSeed = pickMetric(metrics, ['conversion', 'uplift', 'lift', 'sales', 'deposit']) ?? (2 + jitter * 6);
  const sessionsSeed = 600 + Math.floor(jitter * 3200);

  const initial = {
    attention: Math.max(20, Math.min(98, Math.abs(attentionSeed) > 100 ? 70 : Math.abs(attentionSeed))),
    dwell: Math.max(3, Math.min(45, Math.abs(dwellSeed) > 45 ? 18 : Math.abs(dwellSeed))),
    conversion: Math.max(0.5, Math.min(12, Math.abs(conversionSeed) > 12 ? 5 : Math.abs(conversionSeed))),
    sessions: sessionsSeed,
  };

  const [live, setLive] = useState(initial);
  // Per-industry bespoke streams (sparkline history)
  const HISTORY = 28;
  const [streams, setStreams] = useState(() =>
    profile.streams.map((s) => ({
      ...s,
      val: s.seed,
      history: Array.from({ length: HISTORY }, () =>
        Math.max(0, Math.min(s.max, s.seed + (Math.random() - 0.5) * s.volatility * 2))
      ),
    }))
  );

  useEffect(() => {
    setLive(initial);
    setStreams(
      profile.streams.map((s) => ({
        ...s,
        val: s.seed,
        history: Array.from({ length: HISTORY }, () =>
          Math.max(0, Math.min(s.max, s.seed + (Math.random() - 0.5) * s.volatility * 2))
        ),
      }))
    );
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [seedKey]);

  useEffect(() => {
    const id = setInterval(() => {
      setLive((p) => ({
        attention: Math.max(20, Math.min(98, p.attention + (Math.random() - 0.5) * 5)),
        dwell: Math.max(3, Math.min(45, p.dwell + (Math.random() - 0.5) * 1.1)),
        conversion: Math.max(0.5, Math.min(12, p.conversion + (Math.random() - 0.5) * 0.4)),
        sessions: p.sessions + Math.floor(Math.random() * 7),
      }));
      setStreams((prev) =>
        prev.map((s) => {
          const next = Math.max(0, Math.min(s.max, s.val + (Math.random() - 0.5) * s.volatility * 2));
          return { ...s, val: next, history: [...s.history.slice(1), next] };
        })
      );
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <HolographicCanvas density={profile.density} hue={profile.hue} intensity={profile.intensity} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="text-xs font-display tracking-[0.35em] uppercase text-primary mb-2">Live Telemetry · {industryName}</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {industryName} performance, in real time
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-muted-foreground tracking-wide uppercase">Lucen Engine · live</span>
          </span>
        </div>

        {/* Counting metric cards */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {metrics.slice(0, 4).map((m, i) => {
              const parsed = parseNumber(m.value);
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-panel-elevated glow-edge p-5"
                >
                  <p className="font-display text-3xl sm:text-4xl font-semibold text-primary text-glow leading-none">
                    {parsed ? <Counter target={parsed.num} prefix={parsed.prefix} suffix={parsed.suffix} /> : m.value}
                  </p>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] mt-3">{m.label}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Universal live bar telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Attention rate', val: live.attention, suffix: '%', max: 100 },
            { label: 'Avg. dwell', val: live.dwell, suffix: 's', max: 45 },
            { label: 'Conversion', val: live.conversion, suffix: '%', max: 12 },
          ].map((m) => (
            <div key={m.label} className="glass-panel p-5 rounded-md">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{m.label}</p>
                <p className="font-display text-xl text-foreground tabular-nums">
                  {m.val.toFixed(1)}{m.suffix}
                </p>
              </div>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary/60 to-primary"
                  animate={{ width: `${(m.val / m.max) * 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Industry-tailored sparkline streams */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {streams.map((s) => {
            const max = Math.max(s.max, ...s.history);
            const min = Math.min(0, ...s.history);
            const points = s.history
              .map((v, i) => {
                const x = (i / (s.history.length - 1)) * 100;
                const y = 100 - ((v - min) / (max - min || 1)) * 100;
                return `${x},${y}`;
              })
              .join(' ');
            return (
              <div key={s.label} className="glass-panel-elevated glow-edge p-5 rounded-md">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
                  <p className="font-display text-lg text-primary text-glow tabular-nums">
                    {s.val < 10 ? s.val.toFixed(1) : Math.round(s.val)}{s.suffix}
                  </p>
                </div>
                <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full h-12 overflow-visible">
                  <defs>
                    <linearGradient id={`g-${s.label}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={`hsl(${profile.hue} 100% 70%)`} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={`hsl(${profile.hue} 100% 70%)`} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,36 ${points
                      .split(' ')
                      .map((p) => {
                        const [x, y] = p.split(',');
                        return `${x},${(parseFloat(y) / 100) * 36}`;
                      })
                      .join(' ')} 100,36`}
                    fill={`url(#g-${s.label})`}
                  />
                  <polyline
                    points={points
                      .split(' ')
                      .map((p) => {
                        const [x, y] = p.split(',');
                        return `${x},${(parseFloat(y) / 100) * 36}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke={`hsl(${profile.hue} 100% 70%)`}
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-right text-xs text-muted-foreground tabular-nums">
          {live.sessions.toLocaleString()} captured {industryName.toLowerCase()} sessions today
        </div>
      </div>
    </section>
  );
}

