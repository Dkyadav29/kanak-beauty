import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeading } from '@/components/ui';

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

export const TermsPage = () => (
  <PolicyLayout eyebrow="Legal" title="Terms and Conditions" intro="These terms govern your use of the Kanak Beauty Academy website and learning platform.">
    <Section title="1. Accounts">
      <p>You must provide accurate information when registering and keep your login credentials confidential. You are responsible for activity under your account.</p>
    </Section>
    <Section title="2. Enrollment and access">
      <p>Course access is granted after payment is confirmed by our payment provider. Access is personal and non-transferable. Sharing recordings or materials is prohibited.</p>
    </Section>
    <Section title="3. Certificates">
      <p>Certificates are issued only when completion requirements are met and may be revoked if issued in error or obtained through misconduct.</p>
    </Section>
    <Section title="4. Conduct">
      <p>Students must behave respectfully in live sessions. The academy may suspend access for abusive behaviour, with any refund handled under the Refund Policy.</p>
    </Section>
  </PolicyLayout>
);

export const PrivacyPage = () => (
  <PolicyLayout eyebrow="Legal" title="Privacy Policy" intro="How we collect, use and protect your personal information.">
    <Section title="What we collect">
      <p>Name, email, mobile number, learning progress, attendance and payment records (processed by our payment provider; we never store card details).</p>
    </Section>
    <Section title="How we use it">
      <p>To deliver courses, send class reminders and receipts, issue certificates and improve the academy. Marketing messages are optional and can be turned off in your profile.</p>
    </Section>
    <Section title="Your rights">
      <p>You may request a copy of your data or ask for its correction or deletion by contacting the academy. Certificate records may be retained for verification purposes.</p>
    </Section>
  </PolicyLayout>
);

export const RefundPolicyPage = () => (
  <PolicyLayout eyebrow="Legal" title="Refund and Cancellation Policy" intro="Our approach to cancellations, refunds and batch changes.">
    <Section title="Recorded courses">
      <p>Refund requests are considered within 7 days of purchase provided less than 20% of the course content has been accessed.</p>
    </Section>
    <Section title="Live and hybrid batches">
      <p>Full refund if you withdraw at least 7 days before the batch start date. Partial refunds or a transfer to a later batch may be offered after that at the academy’s discretion.</p>
    </Section>
    <Section title="Cancellations by the academy">
      <p>If a batch is cancelled, you may choose a full refund or a transfer to the next available batch.</p>
    </Section>
    <Section title="Processing">
      <p>Approved refunds are returned to the original payment method within 7 to 10 working days. Course access is withdrawn when a refund is processed.</p>
    </Section>
  </PolicyLayout>
);
