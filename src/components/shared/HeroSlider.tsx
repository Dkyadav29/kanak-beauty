import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageWithFallback } from '@/components/ui';

export interface HeroSlide {
  src: string;
  alt: string;
  eyebrow: string;
  caption: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  /** Milliseconds between automatic advances. 0 disables autoplay. */
  intervalMs?: number;
  className?: string;
}

const SWIPE_THRESHOLD_PX = 60;

/**
 * Horizontal carousel for the public landing hero. Slides move sideways on a
 * track, autoplay (paused while hovered/focused), support swipe/drag, arrow
 * keys, visible prev/next buttons, dots and a counter. With reduced motion the
 * track jumps instead of animating.
 */
export const HeroSlider = ({ slides, intervalMs = 5000, className }: HeroSliderProps) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  useEffect(() => {
    if (paused || intervalMs <= 0 || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [paused, intervalMs, count]);

  if (count === 0) return null;

  return (
    <div
      className={cn('group relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-charcoal-900 shadow-lift sm:aspect-[5/6]', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Academy highlights"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
      }}
    >
      {/* Sliding track: every slide sits side by side, the track shifts by one slide width. */}
      <motion.div
        className="flex h-full w-full touch-pan-y"
        animate={{ x: `${-index * 100}%` }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 32 }}
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD_PX) next();
          else if (info.offset.x > SWIPE_THRESHOLD_PX) prev();
        }}
        aria-live="polite"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className="relative h-full w-full shrink-0 select-none"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <ImageWithFallback
              src={slide.src}
              alt={slide.alt}
              className="pointer-events-none h-full w-full object-cover"
              fallbackLabel="Kanak Academy"
              loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/35 to-transparent p-6 pb-16 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">{slide.eyebrow}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{slide.caption}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-charcoal-900 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-charcoal-900 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute right-5 top-5 rounded-full bg-charcoal-900/60 px-3 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur" aria-hidden>
            {index + 1} / {count}
          </div>

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}: ${s.eyebrow}`}
                onClick={() => go(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  i === index ? 'w-8 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};
