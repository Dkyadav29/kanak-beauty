import { Heart, Target, Users2 } from 'lucide-react';
import { useTrainers } from '@/hooks/useCatalog';
import { IMAGES } from '@/config/images';
import { Avatar, Badge, ImageWithFallback, LinkButton, LoadingSkeleton, SectionHeading } from '@/components/ui';

const values = [
  { icon: Target, title: 'Practical mastery', text: 'Every module ends with hands-on practice. We measure progress by what you can do on a real client, not by what you have watched.' },
  { icon: Heart, title: 'Care for every learner', text: 'Small live cohorts, honest feedback and trainers who remember your name and your goals.' },
  { icon: Users2, title: 'Career-first thinking', text: 'From pricing to portfolio shoots, we teach the business of beauty alongside the craft.' },
];

const AboutPage = () => {
  const trainers = useTrainers();
  return (
    <>
      <section className="container-x grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <SectionHeading eyebrow="About the academy" title="Where artistry meets professional discipline" description="Kanak Beauty Academy was founded to give aspiring beauty professionals a structured, expert-led path from passion to profession. Our programmes combine studio practice, flexible recorded learning and career guidance." />
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/courses">Explore courses</LinkButton>
            <LinkButton to="/contact" variant="outline">
              Visit the academy
            </LinkButton>
          </div>
        </div>
        <div className="relative">
          <ImageWithFallback src={IMAGES.about} alt="Inside the Kanak Beauty Academy training studio" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift" fallbackLabel="Studio" />
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-x">
          <SectionHeading align="center" eyebrow="What we stand for" title="Our teaching philosophy" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16">
        <SectionHeading eyebrow="Our trainers" title="Learn from working professionals" description="Every Kanak trainer is an active industry practitioner." />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trainers.isLoading ? (
            <LoadingSkeleton variant="cards" count={4} />
          ) : (
            trainers.data?.map((t) => (
              <div key={t.id} className="card p-6 text-center">
                <Avatar name={t.name} src={t.avatarUrl} size="xl" className="mx-auto" />
                <h3 className="mt-4 font-display text-xl font-semibold">{t.name}</h3>
                <p className="text-sm text-charcoal-500">{t.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-700">{t.bio}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {t.specialities.map((s) => (
                    <Badge key={s} tone="rose">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};

export default AboutPage;
