import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Layers, UserRound } from 'lucide-react';
import type { CourseSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { ImageWithFallback, LinkButton, StatusBadge } from '@/components/ui';

export const PriceTag = ({ price, discountPrice, currency, size = 'md' }: { price: number; discountPrice: number | null; currency: string; size?: 'sm' | 'md' | 'lg' }) => {
  const main = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-semibold text-charcoal-900 ${main}`}>{formatCurrency(discountPrice ?? price, currency)}</span>
      {discountPrice !== null ? (
        <>
          <span className="text-sm text-charcoal-500 line-through">{formatCurrency(price, currency)}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save {Math.round(((price - discountPrice) / price) * 100)}%</span>
        </>
      ) : null}
    </div>
  );
};

export const CourseCard = ({ course, index = 0 }: { course: CourseSummary; index?: number }) => (
  <motion.article
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.06 }}
    className="group card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift"
  >
    <Link to={`/courses/${course.slug}`} className="relative block aspect-[16/10] overflow-hidden" aria-label={`Open ${course.title}`}>
      <ImageWithFallback src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackLabel={course.title} />
      <div className="absolute left-3 top-3 flex gap-1.5">
        <StatusBadge status={course.level} className="bg-white/90 backdrop-blur" />
        <StatusBadge status={course.format} className="bg-white/90 backdrop-blur" />
      </div>
    </Link>
    <div className="flex flex-1 flex-col p-5">
      <h3 className="font-display text-xl font-semibold leading-snug text-charcoal-900">
        <Link to={`/courses/${course.slug}`} className="hover:text-rose-700">
          {course.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal-500">{course.shortDescription}</p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-charcoal-700">
        <li className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-rose-600" /> {course.trainer.name}
        </li>
        <li className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-rose-600" /> {course.durationWeeks} weeks · {course.totalHours}h
        </li>
        <li className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-rose-600" /> {course.lessonCount} lessons
        </li>
      </ul>
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-ivory-200 pt-4">
        <PriceTag price={course.price} discountPrice={course.discountPrice} currency={course.currency} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <LinkButton to={`/courses/${course.slug}`} variant="outline" size="sm">
          Explore Course
        </LinkButton>
        <LinkButton to={`/student/checkout/${course.id}`} size="sm">
          Enroll Now
        </LinkButton>
      </div>
    </div>
  </motion.article>
);
