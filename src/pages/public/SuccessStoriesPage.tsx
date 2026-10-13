import { IMAGES } from '@/config/images';
import { DemoBadge, ImageWithFallback, InlineAlert, LinkButton, SectionHeading } from '@/components/ui';

const placeholders = [
  { name: 'Student name (placeholder)', course: 'Professional Makeup Artistry', quote: 'Approved testimonial text will appear here.' },
  { name: 'Student name (placeholder)', course: 'Bridal Makeup Masterclass', quote: 'Approved testimonial text will appear here.' },
  { name: 'Student name (placeholder)', course: 'Hair Styling and Hair Care', quote: 'Approved testimonial text will appear here.' },
  { name: 'Student name (placeholder)', course: 'Skincare and Facial Techniques', quote: 'Approved testimonial text will appear here.' },
];

const SuccessStoriesPage = () => (
  <div className="container-x py-12 lg:py-16">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <SectionHeading eyebrow="Student success stories" title="Real students, real careers" description="We only publish testimonials and photographs with written consent from the student. During development this page shows clearly labelled placeholder content." />
      <DemoBadge />
    </div>
    <InlineAlert tone="warning" className="mt-6">
      Demo content: replace these cards with approved student stories before launch. No real names or results are shown here.
    </InlineAlert>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {placeholders.map((p, i) => (
        <figure key={i} className="card flex gap-5 p-6">
          <ImageWithFallback src={IMAGES.gallery[i]} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" fallbackLabel="" />
          <div>
            <blockquote className="font-display text-lg leading-relaxed text-charcoal-800">“{p.quote}”</blockquote>
            <figcaption className="mt-3 text-sm">
              <span className="block font-semibold text-charcoal-900">{p.name}</span>
              <span className="text-charcoal-500">{p.course}</span>
            </figcaption>
          </div>
        </figure>
      ))}
    </div>
    <div className="mt-16">
      <SectionHeading eyebrow="Gallery" title="Student work" description="Portfolio pieces created by students during practical sessions." />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {IMAGES.gallery.map((src, i) => (
          <ImageWithFallback key={src} src={src} alt={`Student work sample ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover" fallbackLabel="Gallery" />
        ))}
      </div>
    </div>
    <div className="mt-16 text-center">
      <LinkButton to="/courses" size="lg">
        Start your own story
      </LinkButton>
    </div>
  </div>
);

export default SuccessStoriesPage;
