import { useMemo } from 'react';
import { OptimizedVideo } from './OptimizedMedia';

export default function LucenHero() {
  const sources = useMemo(() => [
    { src: '/media/mobile101224.mp4', media: '(max-width: 767px)' },
    { src: '/media/tablet091224.mp4', media: '(min-width: 768px) and (max-width: 1023px)' },
    { src: '/media/desktop091224.mp4', media: '(min-width: 1024px)' },
  ], []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <OptimizedVideo
          src="/media/desktop091224.mp4"
          sources={sources}
          poster="/media/corporate_lobby.jpg"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.7) saturate(1.2)' }}
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 40%, hsl(192 95% 60% / 0.08) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 30% 60%, hsl(260 80% 65% / 0.06) 0%, transparent 60%),
              linear-gradient(180deg, transparent 60%, hsl(var(--background)) 100%)
            `,
          }}
        />
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
    </section>
  );
}
