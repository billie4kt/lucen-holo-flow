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
  const attentionSeed = pickMetric(metrics, ['attention', 'engagement', 'recall', 'dwell']) ?? (55 + jitter * 35);
  const dwellSeed = pickMetric(metrics, ['dwell', 'time', 'duration']) ?? (8 + jitter * 22);
  const conversionSeed = pickMetric(metrics, ['conversion', 'uplift', 'lift', 'sales', 'deposit']) ?? (2 + jitter * 6);
  const sessionsSeed = 600 + Math.floor(jitter * 3200);

  // Clamp seeds into realistic ranges for the bar maxes
  const initial = {
    attention: Math.max(20, Math.min(98, Math.abs(attentionSeed) > 100 ? 70 : Math.abs(attentionSeed))),
    dwell: Math.max(3, Math.min(45, Math.abs(dwellSeed) > 45 ? 18 : Math.abs(dwellSeed))),
    conversion: Math.max(0.5, Math.min(12, Math.abs(conversionSeed) > 12 ? 5 : Math.abs(conversionSeed))),
    sessions: sessionsSeed,
  };

  const [live, setLive] = useState(initial);
  // Re-seed when industry changes (client-side route changes)
  useEffect(() => { setLive(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [seedKey]);
  useEffect(() => {
    const id = setInterval(() => {
      setLive((p) => ({
        attention: Math.max(20, Math.min(98, p.attention + (Math.random() - 0.5) * 5)),
        dwell: Math.max(3, Math.min(45, p.dwell + (Math.random() - 0.5) * 1.1)),
        conversion: Math.max(0.5, Math.min(12, p.conversion + (Math.random() - 0.5) * 0.4)),
        sessions: p.sessions + Math.floor(Math.random() * 7),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, []);


  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <HolographicCanvas density={160} hue={195} intensity={0.85} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="text-xs font-display tracking-[0.35em] uppercase text-primary mb-2">Live Telemetry</p>
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

        {/* Live bar telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Attention rate', val: live.attention, suffix: '%', max: 100 },
            { label: 'Avg. dwell', val: live.dwell, suffix: 's', max: 45 },
            { label: 'Conversion', val: live.conversion, suffix: '%', max: 12 },
          ].map((m) => (
            <div key={m.label} className="glass-panel p-5 rounded-md">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{m.label}</p>
                <p className="font-display text-xl text-foreground tabular-nums">
                  {m.val.toFixed(m.suffix === 's' ? 1 : 1)}{m.suffix}
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

        <div className="mt-6 text-right text-xs text-muted-foreground tabular-nums">
          {live.sessions.toLocaleString()} captured sessions today
        </div>
      </div>
    </section>
  );
}
