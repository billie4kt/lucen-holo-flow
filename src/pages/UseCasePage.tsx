import LucenFooter from '@/components/LucenFooter';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCases } from '@/data/usecases';
import { industries } from '@/data/industries';
import LucenHeader from '@/components/LucenHeader';
import ParticleField from '@/components/ParticleField';
import CursorGlow from '@/components/CursorGlow';
import Seo from '@/components/Seo';
import ImmersiveHero from '@/components/ImmersiveHero';
import StaggeredMediaGrid from '@/components/StaggeredMediaGrid';
import StickyScrollytell, { ScrollPanel } from '@/components/StickyScrollytell';
import QuoteForm from '@/components/QuoteForm';

export default function UseCasePage() {
  const { slug } = useParams<{ slug: string }>();
  const useCase = useCases.find((u) => u.slug === slug);

  if (!useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LucenHeader />
        <div className="text-center pt-20">
          <h1 className="font-display text-3xl text-foreground mb-4">Use Case Not Found</h1>
          <Link to="/" className="text-primary hover:underline">Back to Home</Link>
      </div>
      <LucenFooter />
    </div>
  );
}


  const industry = industries.find((i) => i.slug === useCase.industrySlug);
  const heroMedia = useCase.videos[0] ?? useCase.images[0] ?? useCase.image;
  const remaining: { src: string }[] = [
    ...useCase.videos.slice(1).map((src) => ({ src })),
    ...useCase.images.map((src) => ({ src })),
  ];

  // Scrollytell panels — pair each insight with a piece of media
  const insightMedia = [...useCase.videos, ...useCase.images];
  const scrollPanels: ScrollPanel[] = (useCase.insights ?? []).slice(0, 4).map((ins, i) => ({
    media: insightMedia[i % insightMedia.length] ?? heroMedia,
    eyebrow: `Insight 0${i + 1}`,
    heading: useCase.highlights[i] ?? 'Why it works',
    body: ins,
  }));

  return (
    <div className="relative min-h-screen">
      <Seo
        title={`${useCase.title} — Lucen Use Case`}
        description={useCase.description.slice(0, 155)}
        path={`/use-cases/${useCase.slug}`}
      />
      <ParticleField />
      <CursorGlow />
      <LucenHeader />

      <ImmersiveHero
        src={heroMedia}
        eyebrow={industry ? `Use Case · ${industry.name}` : 'Use Case'}
        title={useCase.title}
        subtitle={useCase.description}
        accent={useCase.images[1]}
      />

      {remaining.length > 0 && (
        <StaggeredMediaGrid
          items={remaining}
          eyebrow="In the field"
          heading="Deployments at scale"
        />
      )}

      {scrollPanels.length > 0 && (
        <StickyScrollytell label="The Lucen advantage" panels={scrollPanels} />
      )}

      <div className="pt-8 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 max-w-4xl"
          >
            <p className="text-sm font-display tracking-[0.3em] uppercase text-primary mb-4">
              {industry ? <Link to={`/industries/${industry.slug}`} className="hover:underline">{industry.name}</Link> : 'Overview'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-6">{useCase.title}</h2>
            <p className="text-muted-foreground font-body text-lg leading-relaxed">{useCase.description}</p>
          </motion.div>

          {/* Metrics */}
          {useCase.metrics && useCase.metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
              {useCase.metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-panel-elevated glow-edge p-6 text-center"
                >
                  <p className="font-display text-3xl sm:text-4xl font-semibold text-primary text-glow mb-1">{m.value}</p>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">{m.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Insights + Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
            {useCase.insights && useCase.insights.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">Why it works</h3>
                <div className="space-y-3">
                  {useCase.insights.map((ins) => (
                    <div key={ins} className="glass-panel p-4 rounded-md text-sm font-body text-muted-foreground leading-relaxed border-l-2 border-primary/40">
                      {ins}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">Key highlights</h3>
              <div className="space-y-3">
                {useCase.highlights.map((h) => (
                  <div key={h} className="glass-panel-elevated glow-edge p-4 flex items-center gap-3 group rounded-md">
                    <span className="text-primary text-glow text-sm">◉</span>
                    <span className="font-body text-sm text-foreground group-hover:text-primary transition-colors">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements + Next steps */}
          {useCase.requirements && useCase.requirements.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">Requirements</h3>
                <ul className="space-y-2">
                  {useCase.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-sm text-muted-foreground font-body">
                      <span className="text-primary mt-1">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">Next steps</h3>
                <ol className="space-y-2 text-sm text-muted-foreground font-body list-decimal list-inside">
                  <li>Share venue, audience and outcomes via the form below.</li>
                  <li>30-min discovery call with a Lucen specialist.</li>
                  <li>Tailored proposal with hardware, content and analytics scope.</li>
                  <li>On-site survey and pilot deployment.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tailored Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-panel-elevated glow-edge p-8 sm:p-10 text-center"
          >
            <p className="text-sm font-display tracking-[0.3em] uppercase text-primary mb-3">Get a quote</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Scope your {useCase.title.toLowerCase()}</h3>
            <p className="text-muted-foreground font-body mb-6 max-w-xl mx-auto">
              We’ll tailor the brief to {industry ? industry.name.toLowerCase() : 'your sector'} and respond within one business day.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={`/contact?use_case=${useCase.slug}${industry ? `&industry=${industry.slug}` : ''}`}
                className="glass-panel-elevated glow-edge px-8 py-3 font-display text-sm font-medium tracking-wide text-primary hover:text-foreground transition-colors duration-300"
              >
                Request tailored brief
              </Link>
              <a
                href={`mailto:holograms@lucene.co?subject=${encodeURIComponent(`${useCase.title} — Lucen enquiry`)}`}
                className="glass-panel px-6 py-3 rounded-md font-display text-sm tracking-wide text-foreground hover:text-primary transition-colors"
              >
                Email holograms@lucene.co
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
