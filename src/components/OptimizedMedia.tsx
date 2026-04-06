import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  sizes?: string;
}

export function OptimizedImage({ src, alt, className = '', style, priority = false, sizes }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      className={`transition-all duration-700 ${
        loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'
      } ${className}`}
      style={style}
    />
  );
}

interface OptimizedVideoProps {
  src: string;
  sources?: Array<{ src: string; media?: string; type?: string }>;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  loop?: boolean;
  poster?: string;
  onEnded?: () => void;
}

export function OptimizedVideo({
  src,
  sources,
  className = '',
  style,
  priority = false,
  loop = true,
  poster,
  onEnded
}: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const primeVideo = () => {
      video.preload = 'auto';
      video.load();
      video.play().catch(() => {});
    };

    if (priority) {
      primeVideo();
    } else {
      video.preload = 'none';
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            primeVideo();
            observer.disconnect();
          }
        },
        { rootMargin: '300px' }
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
      preload={priority ? 'auto' : 'none'}
      onLoadedData={() => setLoaded(true)}
      onEnded={onEnded}
      className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={style}
      poster={poster}
    >
      {sources?.length
        ? sources.map((source) => (
            <source key={`${source.src}-${source.media ?? 'all'}`} src={source.src} media={source.media} type={source.type ?? 'video/mp4'} />
          ))
        : <source src={src} type="video/mp4" />}
    </video>
  );
}
