import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton, SectionHeading } from '@/components/ui';
import { PolicyText } from '@/components/shared/PolicyText';
import { usePolicy } from '@/hooks/useCatalog';
import { POLICY_DEFAULTS } from '@/lib/policyDefaults';
import { formatDate } from '@/lib/utils';
import type { PolicySlug } from '@/types';

const PolicyLayout = ({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) => (
  <div className="container-x max-w-3xl py-12 lg:py-16">
    <SectionHeading eyebrow={eyebrow} title={title} description={intro} />
    <div className="prose-kanak mt-10 space-y-8 text-charcoal-700">{children}</div>
    <p className="mt-12 text-xs text-charcoal-500">This text is a development placeholder. Final policy wording must be reviewed by the academy and its legal advisor before launch.</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2 className="font-display text-2xl font-semibold text-charcoal-900">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed sm:text-base">{children}</div>
  </section>
);

export const FaqPage = () => (
  <PolicyLayout eyebrow="Help centre" title="Frequently asked questions" intro="Answers to the questions we hear most often from new students.">
    {[
      ['Do I need prior experience?', 'Most beginner courses need no prior experience. Advanced programmes such as the Bridal Makeup Masterclass list their prerequisites on the course page.'],
      ['How do live classes work?', 'Live classes are scheduled per batch. Enrolled students see a Join button on their Live Classes page that activates shortly before the class begins.'],
      ['Can I watch classes later?', 'Recordings are made available to enrolled students where the trainer has enabled them. Some practical sessions are not recorded.'],
      ['When do I receive my certificate?', 'Certificates are issued once the backend confirms you have met the course’s completion requirements, such as finishing all required lessons, attending the minimum live sessions and passing any assessment.'],
      ['How can an employer verify my certificate?', 'Every certificate carries a unique number and a verification link. Anyone can check it on our Verify page.'],
    ].map(([q, a]) => (
      <Section key={q} title={q}>
        <p>{a}</p>
      </Section>
    ))}
    <p className="text-sm">
      Still have a question?{' '}
      <Link to="/contact" className="font-semibold text-rose-700 hover:underline">
        Contact us
      </Link>
      .
    </p>
  </PolicyLayout>
);

/** Terms, Privacy and Refund: the admin-published version when there is one, else the default text. */
const PolicyDocumentPage = ({ slug }: { slug: PolicySlug }) => {
  const policy = usePolicy(slug);
  const fallback = POLICY_DEFAULTS[slug];
  const published = policy.data;
  return (
    <div className="container-x max-w-3xl py-12 lg:py-16">
      <SectionHeading eyebrow="Legal" title={published?.title ?? fallback.title} description={published?.summary || fallback.intro} />
      <div className="mt-10">
        {policy.isLoading ? <LoadingSkeleton variant="list" count={4} /> : <PolicyText content={published?.content ?? fallback.content} />}
      </div>
      <p className="mt-12 text-xs text-charcoal-500">
        {published
          ? `Version ${published.version} · published ${formatDate(published.publishedAt)}`
          : 'Draft wording, not yet published by the academy. It must be reviewed by the academy and its legal advisor before launch.'}
      </p>
    </div>
  );
};

export const TermsPage = () => <PolicyDocumentPage slug="terms" />;
export const PrivacyPage = () => <PolicyDocumentPage slug="privacy" />;
export const RefundPolicyPage = () => <PolicyDocumentPage slug="refund" />;
