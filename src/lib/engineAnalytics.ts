import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'lucen_engine_session';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-session';
  }
}

/* ---------------- client environment detection ---------------- */

export type ClientEnv = {
  device: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  country: string;
  timezone: string;
  language: string;
  screen: string;
  viewport: string;
  platform: string;
  host: string;
  origin: string;
};

/** Detects which hosting platform is serving the current page. */
export function detectPlatform(host: string): string {
  const h = host.toLowerCase();
  if (/localhost|127\.0\.0\.1|\.local$/.test(h)) return 'Local';
  if (/(^|\.)vercel\.app$/.test(h)) return 'Vercel';
  if (/(^|\.)onrender\.com$/.test(h)) return 'Render';
  if (/(^|\.)up\.railway\.app$|(^|\.)railway\.app$/.test(h)) return 'Railway';
  if (/(^|\.)lovable\.app$|(^|\.)lovableproject\.com$/.test(h)) return 'Lovable';
  if (/(^|\.)netlify\.app$/.test(h)) return 'Netlify';
  if (/(^|\.)pages\.dev$/.test(h)) return 'Cloudflare';
  if (/(^|\.)fly\.dev$/.test(h)) return 'Fly.io';
  if (/(^|\.)github\.io$/.test(h)) return 'GitHub Pages';
  if (/(^|\.)web\.app$|(^|\.)firebaseapp\.com$/.test(h)) return 'Firebase';
  if (/(^|\.)amplifyapp\.com$/.test(h)) return 'AWS Amplify';
  if (/(^|\.)azurestaticapps\.net$/.test(h)) return 'Azure';
  return 'Custom domain';
}


function detectOS(ua: string): string {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari';
  if (/firefox\//i.test(ua)) return 'Firefox';
  return 'Other';
}

function detectDevice(ua: string, width: number): ClientEnv['device'] {
  if (/ipad|tablet|playbook|silk/i.test(ua) || (width >= 768 && width < 1024 && /android/i.test(ua))) return 'tablet';
  if (/mobi|iphone|android|phone/i.test(ua) || width < 768) return 'mobile';
  return 'desktop';
}

/** Region code derived from locale / timezone — no network call, privacy friendly. */
function detectCountry(timezone: string): string {
  try {
    const loc = navigator.language || '';
    const parts = loc.split('-');
    const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
    if (/^[A-Z]{2}$/.test(region)) return region;
  } catch { /* noop */ }
  // fallback: city segment of the IANA timezone
  const seg = timezone.split('/').pop();
  return seg ? seg.replace(/_/g, ' ') : 'Unknown';
}

export function getClientEnv(): ClientEnv {
  if (typeof window === 'undefined') {
    return { device: 'desktop', os: 'Other', browser: 'Other', country: 'Unknown', timezone: 'UTC', language: 'en', screen: '', viewport: '' };
  }
  const ua = navigator.userAgent;
  let timezone = 'UTC';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { /* noop */ }
  return {
    device: detectDevice(ua, window.innerWidth),
    os: detectOS(ua),
    browser: detectBrowser(ua),
    country: detectCountry(timezone),
    timezone,
    language: navigator.language || 'en',
    screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/* ---------------- event tracking ---------------- */

export type EngineEventType = 'cta_click' | 'conversion' | 'page_view' | 'page_exit';

export type EngineEvent = {
  event_type: EngineEventType;
  integration_slug?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function trackEngineEvent(evt: EngineEvent): Promise<void> {
  if (typeof window === 'undefined') return;
  const env = getClientEnv();
  const payload = {
    event_type: evt.event_type,
    integration_slug: evt.integration_slug ?? null,
    source: evt.source ?? null,
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    session_id: getSessionId(),
    metadata: { ...env, ...(evt.metadata ?? {}) } as never,
  };
  // Fire-and-forget; do not block UI.
  void supabase.from('engine_events').insert(payload).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[engine] track failed', error.message);
    }
  });
}

/** Track a page view and return a function that records dwell time on exit. */
export function trackPageView(path: string): () => void {
  const start = Date.now();
  void trackEngineEvent({ event_type: 'page_view', source: 'router', metadata: { path } });
  let sent = false;
  const flush = () => {
    if (sent) return;
    sent = true;
    const dwell_ms = Date.now() - start;
    if (dwell_ms < 500) return;
    void trackEngineEvent({
      event_type: 'page_exit',
      source: 'router',
      metadata: { path, dwell_ms, dwell_s: Math.round(dwell_ms / 1000) },
    });
  };
  return flush;
}
