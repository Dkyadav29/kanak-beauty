import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BriefcaseBusiness, CalendarCheck2, GraduationCap, PlayCircle, Route, Sparkles, Users, Video } from 'lucide-react';
import { useAcademyStats, useCourses, useUpcomingSessions } from '@/hooks/useCatalog';
import { useAuth } from '@/features/auth/AuthContext';
import { IMAGES } from '@/config/images';
import { CourseCard } from '@/components/shared/CourseCard';
import { LiveClassCard } from '@/components/shared/LiveClassCard';
import { DemoBadge, EmptyState, ErrorState, ImageWithFallback, LinkButton, LoadingSkeleton, SectionHeading } from '@/components/ui';

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
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-rose-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-gold-100/80 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="eyebrow">Professional beauty education</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] text-charcoal-900 sm:text-6xl lg:text-7xl">
              Turn Your Passion for Beauty into a <span className="text-rose-600">Professional Career.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-500">
              Learn professional makeup, skincare, hairstyling, bridal artistry, and salon techniques through expert-led training designed to build your skills and confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/courses" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Explore Courses
              </LinkButton>
              <LinkButton to={isAuthenticated ? '/student/dashboard' : '/register'} size="lg" variant="outline">
                {isAuthenticated ? 'Go to my dashboard' : 'Join Kanak Academy'}
              </LinkButton>
            </div>

            {/* Trust stats */}
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-20 animate-pulse" />)
              ) : stats.data ? (
                [
                  { label: 'Courses offered', value: stats.data.coursesOffered, icon: GraduationCap },
                  { label: 'Enrolled students', value: stats.data.enrolledStudents, icon: Users },
                  { label: 'Expert trainers', value: stats.data.expertTrainers, icon: Sparkles },
                  { label: 'Certificates issued', value: stats.data.certificatesIssued, icon: Award },
                ].map((s) => (
                  <div key={s.label} className="card relative px-4 py-3.5">
                    <s.icon className="h-4 w-4 text-rose-600" />
                    <p className="mt-1.5 font-display text-2xl font-semibold text-charcoal-900">{s.value}</p>
                    <p className="text-xs text-charcoal-500">{s.label}</p>
                    {stats.data?.isDemoData ? <DemoBadge className="absolute right-2 top-2" /> : null}
                  </div>
                ))
              ) : null}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift sm:aspect-[5/6]">
              <ImageWithFallback src={IMAGES.hero} alt="A professional makeup artist applying makeup to a client during a training session" className="h-full w-full object-cover" fallbackLabel="Kanak Academy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-900/70 to-transparent p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Studio practice</p>
                <p className="mt-1 font-display text-2xl font-semibold">Learn on real models, with real feedback.</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden w-56 overflow-hidden rounded-2xl border-4 border-ivory-100 shadow-lift sm:block">
              <ImageWithFallback src={IMAGES.heroSecondary} alt="Makeup brushes and palette laid out for a class" className="aspect-[4/3] w-full object-cover" fallbackLabel="Kit" />
            </div>
          </motion.div>
        </div>
      </section>

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
