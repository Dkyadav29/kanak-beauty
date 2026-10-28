import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin, MessageCircle, Clock3 } from 'lucide-react';
import { useCourses, useSiteSettings } from '@/hooks/useCatalog';
import { contactLines } from '@/lib/siteContact';
import { Logo } from '@/components/ui';

const FOOTER_COURSE_LIMIT = 5;
const CONTACT_ICON = { email: Mail, phone: Phone, whatsapp: MessageCircle, address: MapPin, hours: Clock3 } as const;


type FooterLink = { to: string; label: string };

const FooterColumn = ({ title, links, loading = false }: { title: string; links: FooterLink[]; loading?: boolean }) => (
  <div>
    <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-500">{title}</h4>
    <ul className="mt-4 space-y-2.5">
      {loading
        ? Array.from({ length: 3 }, (_, i) => (
            <li key={`loading-${i}`} aria-hidden>
              <span className="block h-4 w-40 max-w-full animate-pulse rounded bg-ivory-200" />
            </li>
          ))
        : null}
      {links.map((l) => (
        <li key={l.to + l.label}>
          <Link to={l.to} className="text-sm text-charcoal-700 transition-colors hover:text-rose-700">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Published courses from the API (same request and cache as the courses page): featured first,
 * then the rest in API order. "View all courses" is always shown, so the column still works
 * while loading, on an API error or before any course is published.
 */
const CoursesColumn = () => {
  const courses = useCourses();
  const list = courses.data ?? [];
  const ordered = [...list.filter((c) => c.featured), ...list.filter((c) => !c.featured)];
  const links: FooterLink[] = ordered.slice(0, FOOTER_COURSE_LIMIT).map((c) => ({ to: `/courses/${c.slug}`, label: c.title }));
  links.push({ to: '/courses', label: 'View all courses' });
  return <FooterColumn title="Courses" links={links} loading={courses.isLoading} />;
};

const columns = [
  {
    title: 'Academy',
    links: [
      { to: '/about', label: 'About Kanak' },
      { to: '/success-stories', label: 'Student Success Stories' },
      { to: '/contact', label: 'Contact Us' },
      { to: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { to: '/terms', label: 'Terms and Conditions' },
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/refund-policy', label: 'Refund and Cancellation' },
      { to: '/verify', label: 'Verify a Certificate' },
    ],
  },
];

/** Company contact details managed in Admin > Branding. */
const FooterContact = () => {
  const site = useSiteSettings();
  const lines = contactLines(site.data);
  if (!lines.length) return null;
  return (
    <ul className="mt-6 space-y-2.5 text-sm text-charcoal-700">
      {lines.map((l) => {
        const Icon = CONTACT_ICON[l.kind];
        const body = <span className="whitespace-pre-line">{l.value}</span>;
        return (
          <li key={l.kind} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-label={l.label} />
            {l.href ? (
              <a href={l.href} className="hover:text-rose-700" {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const PublicFooter = () => (
  <footer className="border-t border-ivory-300 bg-white">
    <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Logo />
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-charcoal-500">
          Kanak Beauty Service trains aspiring makeup artists, hairstylists, skincare specialists and salon professionals through expert-led, practical education.
        </p>
        <FooterContact />
        <div className="mt-6 flex gap-2">
          {[
            { icon: Instagram, label: 'Instagram' },
            { icon: Facebook, label: 'Facebook' },
            { icon: Youtube, label: 'YouTube' },
          ].map(({ icon: Icon, label }) => (
            <a key={label} href="#" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory-300 text-charcoal-700 transition-colors hover:border-rose-300 hover:text-rose-700">
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
      <FooterColumn title={columns[0].title} links={columns[0].links} />
      <CoursesColumn />
      <FooterColumn title={columns[1].title} links={columns[1].links} />
    </div>
    <div className="border-t border-ivory-200">
      <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-charcoal-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Kanak Beauty Service. All rights reserved.</p>
        <p>Contact details, imagery and testimonials shown during development are placeholders.</p>
      </div>
    </div>
  </footer>
);
