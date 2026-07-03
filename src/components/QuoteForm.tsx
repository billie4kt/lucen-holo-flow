import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEngineEvent } from '@/lib/engineAnalytics';
import type { Industry } from '@/data/industries';
import type { UseCase } from '@/data/usecases';

type FieldType = 'text' | 'select' | 'number' | 'date' | 'textarea';
interface TailoredField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

const DEFAULT_INDUSTRY_FIELDS: TailoredField[] = [
  { name: 'venue', label: 'Venue / location', type: 'text', placeholder: 'e.g. Nairobi flagship, Dubai Mall' },
  { name: 'audience_size', label: 'Expected audience', type: 'select', options: ['<500', '500–2,000', '2,000–10,000', '10,000–50,000', '50,000+'] },
];

const INDUSTRY_FIELDS: Record<string, TailoredField[]> = {
  'retail-luxury': [
    { name: 'venue', label: 'Store / flagship', type: 'text', placeholder: 'e.g. Village Market flagship' },
    { name: 'store_count', label: 'Number of stores', type: 'select', options: ['1', '2–5', '6–20', '20+'] },
    { name: 'launch_window', label: 'Launch window', type: 'select', options: ['This month', 'Next quarter', 'Seasonal (holiday)', 'Flexible'] },
    { name: 'daily_footfall', label: 'Daily footfall', type: 'select', options: ['<500', '500–2,000', '2,000–10,000', '10,000+'] },
  ],
  'real-estate': [
    { name: 'development_name', label: 'Development name', type: 'text', placeholder: 'e.g. Riverside Heights' },
    { name: 'units_count', label: 'Units to visualize', type: 'select', options: ['1–10', '10–50', '50–200', '200+'] },
    { name: 'assets_ready', label: 'BIM / 3D model ready?', type: 'select', options: ['Yes, architectural', 'Yes, marketing renders', 'In progress', 'No — need production'] },
    { name: 'sales_gallery', label: 'Sales gallery status', type: 'select', options: ['Existing gallery', 'Building one', 'Pop-up / roadshow', 'Broker offices'] },
  ],
  automotive: [
    { name: 'brand_models', label: 'Brand & models to feature', type: 'text', placeholder: 'e.g. BMW iX, X7' },
    { name: 'showroom_size', label: 'Showroom footprint', type: 'select', options: ['<50 m²', '50–150 m²', '150–500 m²', '500 m²+'] },
    { name: 'launch_date', label: 'Target launch date', type: 'date' },
    { name: 'config_needed', label: 'Live configurator?', type: 'select', options: ['Yes — color & trim', 'Yes — full config', 'Not required'] },
  ],
  telecom: [
    { name: 'retail_stores', label: 'Retail stores in scope', type: 'select', options: ['1–5', '5–20', '20–100', '100+'] },
    { name: 'campaign_region', label: 'Campaign region', type: 'text', placeholder: 'e.g. East Africa, GCC' },
    { name: 'product_line', label: 'Product line', type: 'text', placeholder: 'e.g. 5G rollout, device launch' },
  ],
  banking: [
    { name: 'branch_count', label: 'Branches in scope', type: 'select', options: ['1', '2–10', '10–50', '50+'] },
    { name: 'campaign_type', label: 'Campaign type', type: 'select', options: ['Brand', 'Product launch', 'Customer education', 'Investor day'] },
    { name: 'compliance_region', label: 'Compliance region', type: 'text', placeholder: 'e.g. CBK, DFSA' },
  ],
  hospitality: [
    { name: 'property_name', label: 'Property name', type: 'text' },
    { name: 'zone', label: 'Experience zone', type: 'select', options: ['Lobby', 'Restaurant / bar', 'Ballroom / event', 'Suite / VIP', 'Wayfinding'] },
    { name: 'guest_volume', label: 'Monthly guests', type: 'select', options: ['<2,000', '2,000–10,000', '10,000–50,000', '50,000+'] },
  ],
  entertainment: [
    { name: 'event_name', label: 'Show / tour name', type: 'text' },
    { name: 'event_dates', label: 'Event dates', type: 'text', placeholder: 'e.g. 12–14 Sep 2026' },
    { name: 'capacity', label: 'Venue capacity', type: 'select', options: ['<1,000', '1,000–5,000', '5,000–20,000', '20,000+'] },
    { name: 'ticketed', label: 'Ticketed?', type: 'select', options: ['Yes', 'No', 'Hybrid'] },
  ],
  healthcare: [
    { name: 'facility_type', label: 'Facility type', type: 'select', options: ['Hospital', 'Clinic network', 'Pharma HQ', 'Conference'] },
    { name: 'audience', label: 'Audience', type: 'select', options: ['Patients', 'Clinicians', 'Investors', 'Public'] },
    { name: 'sensitivity', label: 'Content sensitivity', type: 'select', options: ['Public / marketing', 'Clinical education', 'Confidential'] },
  ],
  education: [
    { name: 'institution', label: 'Institution', type: 'text' },
    { name: 'audience_age', label: 'Learner age band', type: 'select', options: ['K–12', 'Undergrad', 'Postgrad', 'Executive ed'] },
    { name: 'topic', label: 'Curriculum focus', type: 'text', placeholder: 'e.g. Anatomy, Engineering' },
  ],
  government: [
    { name: 'agency', label: 'Agency / ministry', type: 'text' },
    { name: 'engagement_type', label: 'Engagement type', type: 'select', options: ['Public info', 'Civic event', 'Diplomatic', 'Training'] },
    { name: 'clearance', label: 'Clearance required?', type: 'select', options: ['None', 'Restricted', 'Confidential'] },
  ],
  aviation: [
    { name: 'operator', label: 'Airline / airport', type: 'text' },
    { name: 'terminal_zone', label: 'Zone', type: 'select', options: ['Check-in', 'Airside gate', 'Lounge', 'Baggage / arrivals'] },
    { name: 'daily_pax', label: 'Daily passengers', type: 'select', options: ['<5k', '5k–20k', '20k–100k', '100k+'] },
  ],
  events: [
    { name: 'event_name', label: 'Event name', type: 'text' },
    { name: 'event_dates', label: 'Dates', type: 'text', placeholder: 'e.g. 3–5 Oct' },
    { name: 'attendance', label: 'Attendance', type: 'select', options: ['<500', '500–2,000', '2,000–10,000', '10,000+'] },
    { name: 'sponsor', label: 'Lead sponsor / brand', type: 'text' },
  ],
};

const USE_CASE_FIELDS: TailoredField[] = [
  { name: 'pilot_date', label: 'Preferred pilot date', type: 'date' },
  { name: 'kpi_focus', label: 'Primary KPI', type: 'select', options: ['Dwell time', 'Brand recall', 'Conversion / sales', 'Foot traffic', 'Social reach'] },
  { name: 'existing_assets', label: 'Existing 3D / brand assets', type: 'select', options: ['Yes, production-ready', 'Some — needs polish', 'None — build from scratch'] },
];

const BUDGET_OPTIONS = ['Under $10k', '$10k–25k', '$25k–75k', '$75k–200k', '$200k+', 'Not sure yet'];
const TIMELINE_OPTIONS = ['ASAP (< 4 weeks)', '1–3 months', '3–6 months', '6–12 months', 'Exploring'];

interface QuoteFormProps {
  industry?: Industry;
  useCase?: UseCase;
  className?: string;
}

export default function QuoteForm({ industry, useCase, className = '' }: QuoteFormProps) {
  const contextLabel =
    useCase?.title ?? industry?.name ?? 'your deployment';
  const eyebrow = useCase ? 'Tailored quote' : industry ? `Tailored for ${industry.name}` : 'Request a quote';
  const heading = useCase
    ? `Scope your ${useCase.title.toLowerCase()}`
    : industry
      ? `Scope your ${industry.name.toLowerCase()} deployment`
      : 'Request a tailored quote';

  const tailoredFields = useMemo<TailoredField[]>(() => {
    const base = industry ? (INDUSTRY_FIELDS[industry.slug] ?? DEFAULT_INDUSTRY_FIELDS) : DEFAULT_INDUSTRY_FIELDS;
    return useCase ? [...base, ...USE_CASE_FIELDS] : base;
  }, [industry, useCase]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [notes, setNotes] = useState('');
  const [tailored, setTailored] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (name: string, value: string) =>
    setTailored((prev) => ({ ...prev, [name]: value }));

  const inputClass =
    'w-full glass-panel px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 rounded-md';
  const selectClass = `${inputClass} bg-transparent appearance-none`;
  const labelClass = 'font-display text-xs text-muted-foreground tracking-wide uppercase block mb-2';

  const buildMessage = () => {
    const lines: string[] = [];
    if (useCase) lines.push(`Use case: ${useCase.title}`);
    if (industry) lines.push(`Industry: ${industry.name}`);
    tailoredFields.forEach((f) => {
      const v = tailored[f.name];
      if (v) lines.push(`${f.label}: ${v}`);
    });
    if (notes.trim()) {
      lines.push('');
      lines.push('Notes:');
      lines.push(notes.trim());
    }
    return lines.join('\n');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (!email.trim() && !phone.trim()) return toast.error('Email or phone is required');

    setLoading(true);
    const { error } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      country: country.trim() || null,
      industry: industry?.slug ?? null,
      use_case: useCase?.slug ?? null,
      budget: budget || null,
      timeline: timeline || null,
      message: buildMessage() || null,
      mode: 'quote',
    });
    setLoading(false);

    if (error) {
      toast.error('Could not submit — please try again.');
      return;
    }

    setSubmitted(true);
    toast.success('Quote request received — we\'ll reply within one business day.');
    void trackEngineEvent({
      event_type: 'conversion',
      source: 'quote_form',
      metadata: {
        industry: industry?.slug,
        use_case: useCase?.slug,
        budget,
        timeline,
      },
    });
    setName(''); setEmail(''); setPhone(''); setCompany(''); setCountry('');
    setBudget(''); setTimeline(''); setNotes(''); setTailored({});
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`glass-panel-elevated glow-edge p-6 sm:p-10 ${className}`}
    >
      <div className="mb-6 text-center sm:text-left">
        <p className="text-xs font-display tracking-[0.3em] uppercase text-primary mb-2">{eyebrow}</p>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">{heading}</h3>
        <p className="text-muted-foreground font-body text-sm max-w-xl">
          A Lucen specialist will scope pricing, hardware and content for {contextLabel.toLowerCase()} — reply within one business day.
        </p>
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-10 space-y-3"
        >
          <CheckCircle className="w-10 h-10 text-primary mx-auto" />
          <p className="font-display text-lg text-foreground">Quote request received.</p>
          <p className="text-muted-foreground text-sm">We'll reach out with a tailored scope shortly.</p>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className={labelClass}>Work email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div>
              <label className={labelClass}>Country / market</label>
              <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
            </div>
            <div>
              <label className={labelClass}>Budget range</label>
              <select className={selectClass} value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="" className="bg-card">Select budget</option>
                {BUDGET_OPTIONS.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Timeline</label>
              <select className={selectClass} value={timeline} onChange={(e) => setTimeline(e.target.value)}>
                <option value="" className="bg-card">Select timeline</option>
                {TIMELINE_OPTIONS.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
              </select>
            </div>
          </div>

          {tailoredFields.length > 0 && (
            <div className="pt-4 border-t border-primary/10">
              <p className="font-display text-xs tracking-[0.3em] uppercase text-primary mb-4">
                {useCase ? `${useCase.title} specifics` : industry ? `${industry.name} specifics` : 'Project specifics'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tailoredFields.map((f) => (
                  <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className={labelClass}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        className={selectClass}
                        value={tailored[f.name] ?? ''}
                        onChange={(e) => setField(f.name, e.target.value)}
                      >
                        <option value="" className="bg-card">Select…</option>
                        {f.options?.map((o) => (
                          <option key={o} value={o} className="bg-card">{o}</option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        className={`${inputClass} resize-none`}
                        placeholder={f.placeholder}
                        value={tailored[f.name] ?? ''}
                        onChange={(e) => setField(f.name, e.target.value)}
                        maxLength={500}
                      />
                    ) : (
                      <input
                        type={f.type}
                        className={inputClass}
                        placeholder={f.placeholder}
                        value={tailored[f.name] ?? ''}
                        onChange={(e) => setField(f.name, e.target.value)}
                        maxLength={200}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Anything else we should know?</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Outcomes, constraints, references…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </div>

          <button
            disabled={loading}
            className="w-full glass-panel-elevated glow-edge px-8 py-3 rounded-md font-display text-sm font-medium tracking-wide text-primary hover:text-foreground transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Request tailored quote</>}
          </button>
        </form>
      )}
    </motion.div>
  );
}
