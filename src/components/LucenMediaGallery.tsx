import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { OptimizedImage, OptimizedVideo } from './OptimizedMedia';

interface GalleryItem {
  title: string;
  subtitle: string;
  type: 'video' | 'image';
  src: string;
  poster?: string;
  href: string;
  span: string;
}

const galleryItems: GalleryItem[] = [
  {
    title: 'Retail Activation',
    subtitle: 'Immersive product launches',
    type: 'video' as const,
    src: '/media/Comp-1_10-2.mp4',
    poster: '/media/Starbucks.jpg',
    href: '/use-cases/retail-product-launch',
    span: 'md:col-span-7 md:row-span-2',
  },
  {
    title: 'Corporate Lobby',
    subtitle: 'Brand storytelling in motion',
    type: 'video' as const,
    src: '/media/corporate_lobby.mp4',
    poster: '/media/corporate_lobby.jpg',
    href: '/use-cases/corporate-lobby',
    span: 'md:col-span-5',
  },
  {
    title: 'Real Estate Visualization',
    subtitle: 'Pre-build spatial selling',
    type: 'image' as const,
    src: '/media/real-estate-hologram.jpg',
    href: '/industries/real-estate',
    span: 'md:col-span-5',
  },
  {
    title: 'Automotive Showroom',
    subtitle: 'High-impact product discovery',
    type: 'video' as const,
    src: '/media/autoshowroom_vid-2.mp4',
    poster: '/media/auto-showroom-2.jpg',
    href: '/use-cases/automotive-showroom',
    span: 'md:col-span-4',
  },
  {
    title: 'DOOH Network',
    subtitle: 'High-footfall media surfaces',
    type: 'video' as const,
    src: '/media/DOOH_anomorphic_screens.mp4',
    href: '/industries/airports-malls',
    span: 'md:col-span-4',
  },
  {
    title: 'Events & Exhibitions',
    subtitle: 'Crowd-stopping experiences',
    type: 'video' as const,
    src: '/media/exhibitions.mp4',
    href: '/industries/events-exhibitions',
    span: 'md:col-span-4',
  },
];

export default function LucenMediaGallery() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-sm font-display tracking-[0.3em] uppercase text-accent mb-4">Media Engine</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            Spatial Media Gallery
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-2xl mx-auto">
            A live grid of Lucen moments across launches, lobbies, showrooms, networks, and immersive environments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[240px] md:auto-rows-[180px]">
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={item.span}
            >
              <Link to={item.href} className="group relative block h-full overflow-hidden glass-panel-elevated glow-edge">
                <div className="absolute inset-0">
                  {item.type === 'video' ? (
                    <OptimizedVideo
                      src={item.src}
                      poster={item.poster}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-95 group-hover:scale-[1.03] transition-all duration-700"
                    />
                  ) : (
                    <OptimizedImage
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-75 group-hover:opacity-95 group-hover:scale-[1.03] transition-all duration-700"
                    />
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="font-display text-xs uppercase tracking-[0.25em] text-primary mb-2">Live Surface</p>
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}