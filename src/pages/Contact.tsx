import LucenFooter from '@/components/LucenFooter';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LucenHeader from '@/components/LucenHeader';
import ParticleField from '@/components/ParticleField';
import CursorGlow from '@/components/CursorGlow';
import Seo from '@/components/Seo';
import WhatsAppButton from '@/components/WhatsAppButton';
import { OptimizedImage } from '@/components/OptimizedMedia';
import StickyScrollytell, { ScrollPanel } from '@/components/StickyScrollytell';
// ImmersiveHero replaced with a custom glassmorphic landscape hero below
import { Phone, MessageCircle, PhoneCall, Mail, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEngineEvent } from '@/lib/engineAnalytics';
import { industries } from '@/data/industries';
import { useCases } from '@/data/usecases';

const SUPPORT_EMAIL = 'holograms@lucene.co';
const SITE_URL = 'https://lucen-holo-flow.lovable.app';

const CONTACT_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ContactPage',
      '@id': `${SITE_URL}/contact#contactpage`,
      url: `${SITE_URL}/contact`,
      name: 'Contact Lucen — Talk to a Holographic Specialist',
      description:
        'Reach the Lucen team to scope a holographic deployment, request a demo, or schedule a callback with a specialist.',
      inLanguage: 'en',
      isPartOf: { '@id': `${SITE_URL}#website` },
      mainEntity: { '@id': `${SITE_URL}#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#org`,
      name: 'Lucen',
      url: SITE_URL,
      email: SUPPORT_EMAIL,
      telephone: '+254-727-750-097',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+254-727-750-097',
          email: SUPPORT_EMAIL,
          contactType: 'sales',
          areaServed: ['KE', 'AE', 'GB', 'US', 'Global'],
          availableLanguage: ['en'],
          hoursAvailable: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:00',
            closes: '18:00',
          },
        },
        {
          '@type': 'ContactPoint',
          email: SUPPORT_EMAIL,
          contactType: 'customer support',
          availableLanguage: ['en'],
        },
      ],
    },
    {
      '@type': 'Service',
      '@id': `${SITE_URL}/contact#service`,
      serviceType: 'Holographic display deployment & content production',
      provider: { '@id': `${SITE_URL}#org` },
      areaServed: 'Worldwide',
      audience: { '@type': 'BusinessAudience', audienceType: 'Brands, retailers, venues, agencies' },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Lucen Holographic Services',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Retail & DOOH holographic activations' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Automotive showroom holograms' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Trade show immersive booths' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Corporate lobby installations' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Events & live productions' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Real estate hologram experiences' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Hospitality holographic environments' } },
        ],
      },
    },
  ],
};

export default function Contact() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'message' | 'call' | 'callback'>('message');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [useCase, setUseCase] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Pre-fill industry / use case from query string when arriving from a deep link
  useEffect(() => {
    const i = params.get('industry');
    const u = params.get('use_case');
    if (i) setIndustry(i);
    if (u) setUseCase(u);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (mode === 'message' && !email.trim()) { toast.error('Email is required'); return; }
    if (mode === 'callback' && !phone.trim()) { toast.error('Phone number is required'); return; }

    setLoading(true);
    const { error } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      country: country.trim() || null,
      industry: industry || null,
      use_case: useCase || null,
      budget: budget || null,
      timeline: timeline || null,
      message: message.trim() || null,
      mode,
      preferred_time: preferredTime || null,
    });
    setLoading(false);

    if (error) {
      toast.error('Failed to send. Please try again.');
      return;
    }

    setSubmitted(true);
    toast.success('Message sent — we\'ll be in touch shortly.');
    void trackEngineEvent({
      event_type: 'conversion',
      integration_slug: params.get('integration'),
      source: 'contact_form',
      metadata: { mode, industry, use_case: useCase, budget, timeline },
    });
    setName(''); setEmail(''); setPhone(''); setCompany(''); setCountry('');
    setMessage(''); setPreferredTime(''); setBudget(''); setTimeline('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  const inputClass = 'w-full glass-panel px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 rounded-md';
  const labelClass = 'font-display text-xs text-muted-foreground tracking-wide uppercase block mb-2';

  return (
    <div className="relative min-h-screen">
      <Seo
        title="Contact Lucen — Talk to a Holographic Specialist"
        description="Reach the Lucen team to scope a holographic deployment, request a demo, or schedule a callback with a specialist."
        path="/contact"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(CONTACT_JSONLD)}</script>
      </Helmet>
      <ParticleField />
      <CursorGlow />
      <LucenHeader />
      <WhatsAppButton />

      {/* Landscape glassmorphic hero — full-bleed, sits below fixed header */}
      <section className="relative w-full pt-16">
        <div className="relative w-screen left-1/2 right-1/2 -mx-[50vw] h-[68vh] min-h-[420px] max-h-[760px] overflow-hidden">
          <OptimizedImage
            src="/media/contact-hero.jpg"
            alt="Holographic deployment by Lucen"
            priority
            fit="cover"
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/95 pointer-events-none" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl w-full mx-auto px-6 pb-12 sm:pb-16">
              <motion.div
                initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel-elevated glow-edge p-6 sm:p-10 max-w-2xl"
                style={{ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}
              >
                <p className="text-xs sm:text-sm font-display tracking-[0.3em] uppercase text-primary mb-3">Reach Out</p>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                  Let's scope your holographic deployment.
                </h1>
                <p className="text-muted-foreground font-body text-base sm:text-lg mt-4">
                  Share a few details and a Lucen specialist will respond within one business day.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky-layered scrollytelling — frame orientation matches each media's intrinsic aspect */}
      <StickyScrollytell
        label="Working with Lucen"
        panels={[
          {
            media: '/media/contact-hero.jpg',
            orientation: 'landscape',
            mediaWidth: 1920,
            mediaHeight: 850,
            eyebrow: 'Step 01',
            heading: 'Tell us the brief',
            body: 'Venue, audience, dwell time, brand outcomes. We translate it into a holographic scope you can sign off in days.',
          },
          {
            media: '/media/scale-your-message.mp4',
            orientation: 'landscape',
            mediaWidth: 1200,
            mediaHeight: 900,
            eyebrow: 'Step 02',
            heading: 'Pilot in 4–6 weeks',
            body: 'A specialist pairs with your team for survey, content design, and a working pilot at your venue or event.',
          },
          {
            media: '/media/corporate_lobby-2.mp4',
            orientation: 'portrait',
            mediaWidth: 720,
            mediaHeight: 1280,
            eyebrow: 'Step 03',
            heading: 'Operate the Lucen Engine',
            body: 'Live dwell, attention and conversion analytics — we tune content weekly so every screen keeps earning attention.',
          },
        ] satisfies ScrollPanel[]}
      />



      {/* Form + Side Image */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Side Image — sticks beside the form on desktop */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 lg:sticky lg:top-28 self-start"
          >
            <div className="glass-panel-elevated glow-edge overflow-hidden">
              <div className="relative aspect-square w-full bg-black/40">
                <div className="absolute inset-0 scale-110 blur-2xl opacity-50">
                  <OptimizedImage src="/media/contact-beside-form.jpg" alt="" className="absolute inset-0 w-full h-full" />
                </div>
                <OptimizedImage
                  src="/media/contact-beside-form.jpg"
                  alt="Holographic locomotive installation"
                  fit="contain"
                  width={1200}
                  height={1200}
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <div className="p-6 space-y-4">
                <p className="font-display text-lg text-foreground">Direct lines</p>
                <div className="space-y-3 text-sm">
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 text-primary" /> {SUPPORT_EMAIL}
                  </a>
                  <a href="tel:+254727750097" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 text-primary" /> +254 727 750 097
                  </a>
                </div>
                <p className="text-muted-foreground text-xs">Mon–Fri · 8 AM – 6 PM EAT</p>
              </div>
            </div>
          </motion.aside>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 glass-panel-elevated glow-edge p-8 sm:p-10"
          >
            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-8">
              {[
                { key: 'message' as const, label: 'Send Message', icon: MessageCircle },
                { key: 'call' as const, label: 'Call Us', icon: Phone },
                { key: 'callback' as const, label: 'Request Callback', icon: PhoneCall },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setMode(tab.key); setSubmitted(false); }}
                  className={`glass-panel px-3 py-2.5 rounded-md font-display text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all duration-300 ${
                    mode === tab.key ? 'text-primary border-primary/30 glow-edge' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {submitted && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-3">
                <CheckCircle className="w-10 h-10 text-primary mx-auto" />
                <p className="font-display text-lg text-foreground">Thank you!</p>
                <p className="text-muted-foreground text-sm">We’ll be in touch within one business day.</p>
              </motion.div>
            )}

            {!submitted && mode === 'call' && (
              <div className="text-center space-y-6 py-4">
                <p className="text-muted-foreground font-body text-sm">Speak directly with our team</p>
                <a href="tel:+254727750097" className="w-full glass-panel-elevated glow-edge px-8 py-4 font-display text-lg font-medium tracking-wide text-primary hover:text-foreground transition-colors duration-300 flex items-center justify-center gap-3">
                  <Phone className="w-5 h-5" /> +254 727 750 097
                </a>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full glass-panel-elevated glow-edge px-8 py-4 font-display text-base tracking-wide text-foreground hover:text-primary transition-colors duration-300 flex items-center justify-center gap-3">
                  <Mail className="w-5 h-5" /> {SUPPORT_EMAIL}
                </a>
                <p className="text-muted-foreground font-body text-xs">Available Mon–Fri, 8 AM – 6 PM EAT</p>
              </div>
            )}

            {!submitted && mode !== 'call' && (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  {mode === 'message' ? (
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" className={inputClass} placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input type="tel" className={inputClass} placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                  )}
                  {mode === 'callback' && (
                    <>
                      <div>
                        <label className={labelClass}>Email (optional)</label>
                        <input type="email" className={inputClass} placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Preferred time</label>
                        <select className={`${inputClass} bg-transparent appearance-none`} value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                          <option value="" className="bg-card">Select a time</option>
                          <option value="morning" className="bg-card">Morning (8 AM – 12 PM)</option>
                          <option value="afternoon" className="bg-card">Afternoon (12 – 4 PM)</option>
                          <option value="evening" className="bg-card">Evening (4 – 6 PM)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>


                <div>
                  <label className={labelClass}>{mode === 'callback' ? 'Brief note (optional)' : 'Project details'}</label>
                  <textarea
                    rows={mode === 'callback' ? 3 : 5}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell us about your venue, audience, and what success looks like…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <button disabled={loading} className="w-full glass-panel-elevated glow-edge px-8 py-3 rounded-md font-display text-sm font-medium tracking-wide text-primary hover:text-foreground transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : (mode === 'callback' ? 'Request Callback' : 'Send Message')}
                </button>

                <p className="text-muted-foreground text-xs text-center">
                  Prefer email? <Link to="#" onClick={(e) => { e.preventDefault(); window.location.href = `mailto:${SUPPORT_EMAIL}`; }} className="text-primary hover:underline">{SUPPORT_EMAIL}</Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>
      <LucenFooter />
    </div>
  );
}

