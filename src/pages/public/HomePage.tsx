import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BriefcaseBusiness, CalendarCheck2, GraduationCap, PlayCircle, Route, Sparkles, Users, Video } from 'lucide-react';
import { useAcademyStats, useCourses, useHeroSlides, useHomeVideo, useUpcomingSessions } from '@/hooks/useCatalog';
import { resolveApiUrl } from '@/lib/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import { IMAGES } from '@/config/images';
import { CourseCard } from '@/components/shared/CourseCard';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { HomeVideoPlayer } from '@/components/shared/HomeVideoPlayer';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { DemoBadge, EmptyState, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, SectionHeading, Skeleton, buttonClasses } from '@/components/ui';

const features = [
  { icon: Sparkles, title: 'Expert-led practical training', text: 'Learn hands-on from working makeup artists, hairstylists and skincare specialists on real models.' },
  { icon: PlayCircle, title: 'Flexible recorded learning', text: 'Theory and demonstrations are recorded so you can revisit every technique at your own pace.' },
  { icon: Video, title: 'Interactive live classes', text: 'Join scheduled live studio sessions, get feedback on your work and ask questions in real time.' },
  { icon: Route, title: 'Structured learning paths', text: 'Modules build on each other from fundamentals to client-ready, portfolio-grade work.' },
  { icon: Award, title: 'Course completion certificates', text: 'Earn a verifiable Kanak certificate once you meet each course’s completion requirements.' },
  { icon: BriefcaseBusiness, title: 'Career and salon business skills', text: 'Pricing, client retention and marketing modules prepare you to earn from your craft.' },
];

const testimonials = [
  { name: 'Demo testimonial', role: 'Placeholder - replace with an approved student quote', quote: 'Student testimonials will appear here once approved by the academy. This card demonstrates the layout only.' },
  { name: 'Demo testimonial', role: 'Placeholder - replace with an approved student quote', quote: 'Real quotes, names and photographs must be collected with consent before launch.' },
  { name: 'Demo testimonial', role: 'Placeholder - replace with an approved student quote', quote: 'Testimonial content is intentionally labelled as demo during development.' },
];

const HomePage = () => {
  const courses = useCourses({ featured: true });
  const sessions = useUpcomingSessions(3);
  const stats = useAcademyStats();
  const heroSlides = useHeroSlides();
  const homeVideo = useHomeVideo();
  const { isAuthenticated } = useAuth();
  const slides = useMemo(
    () => (heroSlides.data ?? []).map((s) => ({ id: s.id, src: resolveApiUrl(s.imageUrl), alt: s.alt, eyebrow: s.eyebrow, caption: s.caption, focus: s.focus })),
    [heroSlides.data],
  );
  // Fits the screen whatever the photo size: a viewport-based height, cropped with object-cover + focus.
  const heroFrame = 'h-[560px] sm:h-[600px] lg:h-[min(80vh,760px)]';
  const hasHero = heroSlides.isLoading || slides.length > 0;

  return (
    <>
      {/* Hero: rounded, inset image carousel. Slides are managed by admins (Admin > Hero Slider). */}
      <section className="relative">
        {hasHero ? (
          <div className="px-3 pt-3 sm:px-5 sm:pt-5">
            {heroSlides.isLoading ? (
              <Skeleton className={`w-full rounded-[2rem] ${heroFrame}`} />
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                <HeroSlider
                  slides={slides}
                  intervalMs={6000}
                  className={heroFrame}
                  reserveBottom
                  actions={
                    <>
                      <LinkButton to="/courses" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                        Explore courses
                      </LinkButton>
                      <LinkButton to="/live-classes" size="lg" variant="outline" className="border-white/40 bg-white/10 text-white backdrop-blur-md hover:border-white hover:bg-white/20 hover:text-white" leftIcon={<PlayCircle className="h-4 w-4" />}>
                        Live classes
                      </LinkButton>
                    </>
                  }
                />
              </motion.div>
            )}
          </div>
        ) : null}

        {/* Trust stats: one floating card overlapping the banner's lower edge. */}
        <div className={`container-x relative z-10 ${hasHero ? '-mt-14 sm:-mt-16' : 'mt-8'}`}>
          {stats.isLoading ? (
            <div className="h-24 animate-pulse rounded-3xl bg-white shadow-lift" />
          ) : stats.data ? (
            <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-ivory-200 bg-white/95 shadow-lift backdrop-blur sm:grid-cols-4">
              {[
                { label: 'Courses offered', value: stats.data.coursesOffered, icon: GraduationCap },
                { label: 'Enrolled students', value: stats.data.enrolledStudents, icon: Users },
                { label: 'Expert trainers', value: stats.data.expertTrainers, icon: Sparkles },
                { label: 'Certificates issued', value: stats.data.certificatesIssued, icon: Award },
              ].map((s, i) => (
                <div key={s.label} className={`relative flex items-center gap-3 px-5 py-4 sm:px-6 sm:py-5 ${i % 2 ? 'border-l border-ivory-200' : ''} ${i > 1 ? 'border-t border-ivory-200 sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-semibold leading-none text-charcoal-900 sm:text-3xl">{s.value}</p>
                    <p className="mt-1 truncate text-xs text-charcoal-500">{s.label}</p>
                  </div>
                  {stats.data?.isDemoData ? <DemoBadge className="absolute right-2 top-2" /> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Video section: managed by admins (Admin > Home Video); hidden until switched on. */}
      {homeVideo.data?.enabled ? (
        <section className="container-x pt-16 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <SectionHeading eyebrow={homeVideo.data.eyebrow || undefined} title={homeVideo.data.title} description={homeVideo.data.description || undefined} />
              {homeVideo.data.buttonLabel && homeVideo.data.buttonUrl ? (
                homeVideo.data.buttonUrl.startsWith('/') ? (
                  <LinkButton to={homeVideo.data.buttonUrl} className="mt-6" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    {homeVideo.data.buttonLabel}
                  </LinkButton>
                ) : (
                  <a href={homeVideo.data.buttonUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md', 'mt-6 gap-2')}>
                    {homeVideo.data.buttonLabel} <ArrowRight className="h-4 w-4" />
                  </a>
                )
              ) : null}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
              <HomeVideoPlayer provider={homeVideo.data.provider} embedUrl={homeVideo.data.embedUrl} posterUrl={homeVideo.data.posterUrl} title={homeVideo.data.title} />
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* Featured courses */}
      <section className="container-x py-16 lg:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Featured courses" title="Programmes designed for working professionals" description="Choose live, recorded or hybrid formats. Every course includes a structured curriculum, expert trainers and a verifiable completion certificate." />
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline">
            View all courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10">
          {courses.isLoading ? (
            <LoadingSkeleton variant="cards" count={6} />
          ) : courses.error ? (
            <ErrorState error={courses.error} onRetry={() => void courses.refetch()} compact />
          ) : courses.data && courses.data.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.data.map((c, i) => (
                <CourseCard key={c.id} course={c} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState title="Courses coming soon" description="The academy has not published any courses yet." compact />
          )}
        </div>
      </section>

      {/* Live classes preview */}
      <section className="bg-white py-16 lg:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading eyebrow="Live classes" title="Upcoming live sessions" description="Public visitors can view the schedule. Log in with a valid enrollment to join a session during its join window." />
            <LinkButton to="/live-classes" variant="outline" className="mt-6" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Full schedule
            </LinkButton>
          </div>
          <div className="space-y-4">
            {sessions.isLoading ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : sessions.data && sessions.data.length > 0 ? (
              sessions.data.map((s) => (
                <LiveClassCard
                  key={s.id}
                  session={s}
                  compact
                  action={
                    <LinkButton to={isAuthenticated ? '/student/live-classes' : '/login'} size="sm" variant="secondary" leftIcon={<CalendarCheck2 className="h-4 w-4" />}>
                      {isAuthenticated ? 'View in my classes' : 'Login to join'}
                    </LinkButton>
                  }
                />
              ))
            ) : (
              <EmptyState title="No live classes scheduled" description="Check back soon for the next schedule." compact />
            )}
          </div>
        </div>
      </section>

      {/* Why Kanak */}
      <section className="container-x py-16 lg:py-20">
        <SectionHeading align="center" eyebrow="Why choose Kanak?" title="Everything you need to become a confident professional" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-charcoal-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials & gallery */}
      <section className="bg-charcoal-900 py-16 text-white lg:py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Student stories" title={<span className="text-white">What our students say</span>} description={<span className="text-white/70">Testimonials are shown with permission. Cards below are placeholders during development.</span>} />
            <DemoBadge />
          </div>
          <div className="scrollbar-thin mt-10 flex snap-x gap-5 overflow-x-auto pb-4">
            {testimonials.map((t, i) => (
              <figure key={i} className="min-w-[280px] max-w-sm flex-1 snap-start rounded-2xl border border-white/10 bg-white/5 p-6">
                <blockquote className="font-display text-lg leading-relaxed text-white/90">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="block font-semibold">{t.name}</span>
                  <span className="text-white/60">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold text-white">Student work gallery</h3>
              <Link to="/success-stories" className="text-sm font-semibold text-gold-300 hover:underline">
                See more
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {IMAGES.gallery.map((src, i) => (
                <ImageWithFallback key={src} src={src} alt={`Student work sample ${i + 1}`} className={`w-full rounded-xl object-cover ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`} fallbackLabel="Gallery" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-600 to-rose-800 px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/30 blur-3xl" />
          <p className="eyebrow text-gold-200!">Start today</p>
          <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Your professional beauty career starts here.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">Create your free account to save courses, enroll securely and track every lesson from one dashboard.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/register" variant="gold" size="lg">
              Join Kanak Academy
            </LinkButton>
            <LinkButton to="/contact" variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:border-white hover:text-white">
              Talk to an advisor
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
