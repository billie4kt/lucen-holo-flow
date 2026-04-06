import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export function OptimizedImage({ src, alt, className = '', style, priority = false }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  // Generate WEBP source from JPG/PNG
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        style={style}
      />
    </picture>
  );
}

interface OptimizedVideoProps {
  src: string;
  sources?: Array<{ src: string; media?: string; type?: string }>;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  loop?: boolean;
  onEnded?: () => void;
}

export function OptimizedVideo({ src, sources, className = '', style, priority = false, loop = true, onEnded }: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const primeVideo = async () => {
      try {
        video.preload = 'metadata';
        // Don't auto-play, just preload
        if (priority) {
          video.load();
        }
      } catch (e) {
        console.warn('Video preload failed:', e);
      }
    };

    if (priority) {
      primeVideo();
    } else {
      // Use IntersectionObserver to load video only when visible
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            primeVideo();
            observer.disconnect();
          }
        },
        { rootMargin: '500px' }
      );
      observer.observe(video);
      return () => observer.disconnect();
    }
  }, [priority, src, sources]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop={loop}
      playsInline
      preload={priority ? 'metadata' : 'none'}
      onLoadedData={() => setLoaded(true)}
      onEnded={onEnded}
      className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={style}
    >
      {sources?.length
        ? sources.map((source) => (
            <source key={`${source.src}-${source.media ?? 'all'}`} src={source.src} media={source.media} type={source.type ?? 'video/mp4'} />
          ))
        : <source src={src} type="video/mp4" />}
    </video>
  );
}
