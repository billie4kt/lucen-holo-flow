import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage, OptimizedVideo } from './OptimizedMedia';

interface MediaGalleryProps {
  images: string[];
  videos: string[];
  title: string;
}

export default function MediaGallery({ images, videos, title }: MediaGalleryProps) {
  const allMedia = useMemo(() => [
    ...videos.map((src) => ({ type: 'video' as const, src })),
    ...images.map((src) => ({ type: 'image' as const, src })),
  ], [videos, images]);
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const next = useCallback(() => setCurrent((p) => (p + 1) % allMedia.length), [allMedia.length]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + allMedia.length) % allMedia.length), [allMedia.length]);

  // For images, auto-advance after 6s. For videos, advance when video ends.
  useEffect(() => {
    if (allMedia.length <= 1) return;
    const item = allMedia[current];
    if (item.type === 'video') {
      // Video: listen for ended event (handled via onEnded prop)
      return;
    }
    const timer = setTimeout(next, 6000);
    return () => clearTimeout(timer);
  }, [next, allMedia.length, current, allMedia]);

  if (allMedia.length === 0) return null;

  const item = allMedia[current];

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <div className="relative aspect-video md:aspect-[16/9] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {item.type === 'video' ? (
              <OptimizedVideo src={item.src} className="w-full h-full object-cover" priority loop={allMedia.length <= 1} onEnded={allMedia.length > 1 ? next : undefined} />
            ) : (
              <OptimizedImage src={item.src} alt={title} className="w-full h-full object-cover" priority />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
      </div>

      {allMedia.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-panel-elevated flex items-center justify-center text-foreground hover:text-primary transition-colors z-10"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-panel-elevated flex items-center justify-center text-foreground hover:text-primary transition-colors z-10"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {allMedia.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-6' : 'bg-foreground/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
