import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CalendarDays, Clock, CreditCard, Layers, Wallet } from 'lucide-react';
import type { CourseSummary, PaymentPlanType } from '@/types';
import { useCourseCategories, useCourses } from '@/hooks/useCatalog';
import { courseDurationLabel, formatAmount, paymentOptionSummary, sortedPaymentOptions } from '@/lib/coursePricing';
import { formatDate } from '@/lib/utils';
import { Badge, EmptyState, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, SectionHeading, Select, Tabs, buttonClasses } from '@/components/ui';

const PLAN_ICON: Record<PaymentPlanType, typeof CreditCard> = { full: CreditCard, monthly: CalendarDays, daily: CalendarClock, custom: Wallet };

/** Course card with backend-computed pricing: discount, final fee and every enabled payment option. */
export const CoursePricingCard = ({ course, index = 0 }: { course: CourseSummary; index?: number }) => {
  const p = course.pricing;
  const options = sortedPaymentOptions(p.paymentOptions);
  const details = `/courses/${course.slug}`;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.06 }}
      className="group card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ImageWithFallback src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackLabel={course.title} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {course.category ? <Badge className="border-white/60 bg-white/90 backdrop-blur">{course.category.name}</Badge> : null}
          <Badge className="border-white/60 bg-white/90 backdrop-blur">
            <Clock className="h-3 w-3" /> {courseDurationLabel(course)}
          </Badge>
        </div>
        {p.isDiscountActive ? (
          <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-sm">{p.discountPercent}% OFF</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug text-charcoal-900">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal-500">{course.shortDescription}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-charcoal-700">
          <Layers className="h-3.5 w-3.5 text-rose-600" /> {course.lessonCount} lessons · {course.totalHours}h
        </p>

        <div className="mt-4 rounded-2xl bg-ivory-100 p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-3xl font-semibold text-charcoal-900">{formatAmount(p.finalPrice, course.currency)}</span>
            {p.isDiscountActive ? (
              <>
                <span className="text-sm text-charcoal-500 line-through" aria-label={`Original price ${formatAmount(p.listPrice, course.currency)}`}>
                  {formatAmount(p.listPrice, course.currency)}
                </span>
                <span className="text-xs font-semibold text-emerald-700">Save {formatAmount(p.discountAmount, course.currency)}</span>
              </>
            ) : null}
          </div>
          {p.isDiscountActive && p.discountEndsAt ? <p className="mt-1 text-xs text-rose-700">Offer ends {formatDate(p.discountEndsAt)}</p> : null}

          {options.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-ivory-300 pt-3" aria-label="Payment options">
              {options.map((o) => {
                const Icon = PLAN_ICON[o.type];
                return (
                  <li key={o.type} className="flex items-start gap-2 text-sm">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                    <span className="min-w-0">
                      <span className="font-medium text-charcoal-900">{o.label}</span>
                      <span className="block text-xs text-charcoal-500">
                        {paymentOptionSummary(o, course.currency)}
                        {o.additionalFee > 0 ? ` (incl. ${formatAmount(o.additionalFee, course.currency)} fee)` : ''}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <LinkButton to={details} variant="outline" size="sm">
            View Details
          </LinkButton>
          <LinkButton to={`/student/checkout/${course.id}`} size="sm">
            Enroll Now
          </LinkButton>
        </div>
      </div>
    </motion.article>
  );
};

/** Home page "Courses & Pricing": every published course with category/duration filters. */
export const CoursePricingSection = () => {
  const courses = useCourses();
  const categories = useCourseCategories();
  const [category, setCategory] = useState('all');
  const [duration, setDuration] = useState('all');

  const durations = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of courses.data ?? []) seen.set(courseDurationLabel(c), c.durationDays);
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label);
  }, [courses.data]);

  const visible = useMemo(
    () => (courses.data ?? []).filter((c) => (category === 'all' || c.category?.slug === category) && (duration === 'all' || courseDurationLabel(c) === duration)),
    [courses.data, category, duration],
  );

  // Only offer category tabs that have at least one course.
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses.data ?? []) if (c.category) counts.set(c.category.slug, (counts.get(c.category.slug) ?? 0) + 1);
    return [
      { value: 'all', label: 'All courses', count: courses.data?.length ?? 0 },
      ...(categories.data ?? []).filter((cat) => counts.has(cat.slug)).map((cat) => ({ value: cat.slug, label: cat.name, count: counts.get(cat.slug) })),
    ];
  }, [courses.data, categories.data]);

  const filtered = category !== 'all' || duration !== 'all';

  return (
    <section className="container-x pt-16 lg:pt-20" aria-labelledby="courses-pricing-heading">
      <div id="courses-pricing-heading">
        <SectionHeading
          eyebrow="Courses & pricing"
          title="Find the course that fits your goals and budget"
          description="Short, medium and long-term programmes with transparent fees. Pay in full or spread the fee with daily or monthly installments where available."
        />
      </div>

      {courses.data && courses.data.length > 0 ? (
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs items={tabs} value={category} onChange={setCategory} className="max-w-full md:max-w-[70%]" />
          <label className="flex items-center gap-2 text-sm text-charcoal-700">
            <span className="shrink-0">Duration</span>
            <Select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full md:w-44" aria-label="Filter by duration">
              <option value="all">Any duration</option>
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </label>
        </div>
      ) : null}

      <div className="mt-8">
        {courses.isLoading ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : courses.error ? (
          <ErrorState error={courses.error} onRetry={() => void courses.refetch()} compact />
        ) : visible.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c, i) => (
              <CoursePricingCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : filtered ? (
          <EmptyState
            title="No courses match these filters"
            description="Try another category or duration."
            compact
            action={
              <button
                type="button"
                className={buttonClasses('outline', 'sm')}
                onClick={() => {
                  setCategory('all');
                  setDuration('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState title="Courses coming soon" description="The academy has not published any courses yet." compact />
        )}
      </div>
    </section>
  );
};
