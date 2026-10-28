import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { formatAmount } from '@/lib/coursePricing';
import { ImageWithFallback } from '@/components/ui';
import type { HeroSlideCourse, HeroSlideFocus } from '@/types';

export type { HeroSlideFocus };

export interface HeroSlide {
  /** Stable key; falls back to ``src``. */
  id?: string;
  src: string;
  alt: string;
  eyebrow: string;
  caption: string;
  /** Which part of the photo stays visible when it is cropped to the frame. Defaults to center. */
  focus?: HeroSlideFocus;
  /** Linked course: the whole slide opens it, and its live price/discount is shown. */
  course?: HeroSlideCourse | null;
}

export const FOCUS_CLASS: Record<HeroSlideFocus, string> = {
  center: 'object-center',
  top: 'object-top',
  bottom: 'object-bottom',
  left: 'object-left',
  right: 'object-right',
  'left-top': 'object-left-top',
  'right-top': 'object-right-top',
  'left-bottom': 'object-left-bottom',
  'right-bottom': 'object-right-bottom',
};

interface HeroSliderProps {
  slides: HeroSlide[];
  /** Milliseconds between automatic advances. 0 disables autoplay. */
  intervalMs?: number;
  /** Call-to-action buttons shown on every slide, under the caption. */
  actions?: ReactNode;
  className?: string;
  /** Keep the bottom strip clear for a card that overlaps the banner's lower edge. */
  reserveBottom?: boolean;
}

const SWIPE_THRESHOLD_PX = 60;
// Pointer travel up to this still counts as a click on the slide rather than a swipe.
const CLICK_SLOP_PX = 10;

const glassButton =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

/**
 * Full-bleed carousel for the public landing hero. Slides move sideways on a track,
 * the active photo slowly zooms out, and the caption block (eyebrow, headline, actions)
 * fades in per slide. Autoplay pauses while hovered/focused; swipe/drag, arrow keys,
 * prev/next buttons and progress bars all navigate. Reduced motion disables animation.
 */
export const HeroSlider = ({ slides, intervalMs = 6000, actions, className, reserveBottom = false }: HeroSliderProps) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  // Where the pointer went down, so the click that ends a swipe does not open the course.
  const pressAt = useRef<{ x: number; y: number } | null>(null);
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
  const active = slides[index];
  const animateProgress = !paused && !reduceMotion && intervalMs > 0;

  return (
    <div
      className={cn('group relative overflow-hidden rounded-[2rem] bg-charcoal-900 shadow-lift', active.course && 'cursor-pointer', className)}
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
      onPointerDown={(e) => {
        pressAt.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        // A click anywhere on a course slide opens the course; controls and links handle their own clicks.
        const start = pressAt.current;
        pressAt.current = null;
        const swiped = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP_PX : false;
        if (!active.course || swiped || (e.target as HTMLElement).closest('a,button')) return;
        navigate(`/courses/${active.course.slug}`);
      }}
    >
      {/* Sliding track: every slide sits side by side, the track shifts by one slide width. */}
      <motion.div
        className="flex h-full w-full touch-pan-y"
        animate={{ x: `${-index * 100}%` }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 34 }}
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD_PX) next();
          else if (info.offset.x > SWIPE_THRESHOLD_PX) prev();
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id ?? slide.src}
            className="relative h-full w-full shrink-0 select-none overflow-hidden"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            {/* Slow "Ken Burns" zoom-out on the active slide. */}
            <motion.div
              className="h-full w-full"
              initial={false}
              animate={{ scale: i === index && !reduceMotion ? 1 : 1.08 }}
              transition={{ duration: reduceMotion ? 0 : (intervalMs || 6000) / 1000 + 1.5, ease: 'easeOut' }}
            >
              <ImageWithFallback
                src={slide.src}
                alt={slide.alt}
                className={cn('pointer-events-none h-full w-full object-cover', FOCUS_CLASS[slide.focus ?? 'center'])}
                fallbackLabel="Kanak Beauty Service"
                loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
              />
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* Readability: dark from the bottom on phones, from the left on wider screens. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/40 to-charcoal-900/10 sm:bg-gradient-to-r sm:from-charcoal-900/85 sm:via-charcoal-900/45 sm:to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal-900/60 to-transparent" aria-hidden />

      {/* Caption block */}
      <div className={cn('absolute inset-0 flex items-end sm:items-center', reserveBottom && 'sm:pb-12')}>
        <div className={cn('w-full px-6 sm:px-12 sm:pb-0 lg:px-16', reserveBottom ? 'pb-32' : 'pb-24')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id ?? active.src}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="max-w-2xl text-white"
              aria-live="polite"
            >
              {active.eyebrow ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden />
                  {active.eyebrow}
                </span>
              ) : null}
              {active.course?.isDiscountActive ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white shadow-sm">
                  {active.course.discountPercent}% off
                </span>
              ) : null}
              {active.caption || active.course ? (
                <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] drop-shadow-sm sm:text-5xl lg:text-6xl">{active.caption || active.course?.title}</h2>
              ) : null}
              {active.course ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <p className="flex items-baseline gap-2 drop-shadow-sm">
                    <span className="font-display text-2xl font-semibold sm:text-3xl">{formatAmount(active.course.finalPrice, active.course.currency)}</span>
                    {active.course.isDiscountActive ? <span className="text-sm text-white/70 line-through">{formatAmount(active.course.listPrice, active.course.currency)}</span> : null}
                    {active.course.isDiscountActive && active.course.discountEndsAt ? <span className="text-xs text-gold-200">Offer ends {formatDate(active.course.discountEndsAt)}</span> : null}
                  </p>
                  <Link
                    to={`/courses/${active.course.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-900 shadow-sm transition hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    View course <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
          {actions ? <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">{actions}</div> : null}
        </div>
      </div>

      {count > 1 ? (
        <div className={cn('absolute inset-x-0 bottom-0 flex items-center gap-4 px-6 sm:px-12 lg:px-16', reserveBottom ? 'pb-16 sm:pb-20' : 'pb-6')}>
          {/* Progress bars: the active one fills over the autoplay interval. */}
          <div className="flex flex-1 items-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.id ?? s.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}: ${s.eyebrow || s.alt}`}
                onClick={() => go(i)}
                className="group/bar relative h-1 max-w-24 flex-1 overflow-hidden rounded-full bg-white/25 py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="absolute inset-0 rounded-full bg-white/0 transition group-hover/bar:bg-white/20" aria-hidden />
                {i < index ? <span className="absolute inset-0 rounded-full bg-white/70" aria-hidden /> : null}
                {i === index ? (
                  <motion.span
                    key={`${index}-${animateProgress}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    initial={{ width: animateProgress ? '0%' : '100%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: animateProgress ? intervalMs / 1000 : 0, ease: 'linear' }}
                    aria-hidden
                  />
                ) : null}
              </button>
            ))}
          </div>

          <span className="hidden text-xs font-semibold tabular-nums tracking-wider text-white/80 sm:inline" aria-hidden>
            {String(index + 1).padStart(2, '0')} <span className="text-white/40">/ {String(count).padStart(2, '0')}</span>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={prev} aria-label="Previous slide" className={glassButton}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={next} aria-label="Next slide" className={glassButton}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
