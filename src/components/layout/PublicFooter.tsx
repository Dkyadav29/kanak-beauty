import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { Logo } from '@/components/ui';

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
    title: 'Courses',
    links: [
      { to: '/courses/professional-makeup-artistry', label: 'Professional Makeup Artistry' },
      { to: '/courses/bridal-makeup-masterclass', label: 'Bridal Makeup Masterclass' },
      { to: '/courses/hair-styling-and-hair-care', label: 'Hair Styling & Hair Care' },
      { to: '/courses/skincare-and-facial-techniques', label: 'Skincare & Facials' },
      { to: '/courses', label: 'View all courses' },
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

export const PublicFooter = () => (
  <footer className="border-t border-ivory-300 bg-white">
    <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Logo />
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-charcoal-500">
          Kanak Beauty Academy trains aspiring makeup artists, hairstylists, skincare specialists and salon professionals through expert-led, practical education.
        </p>
        <ul className="mt-6 space-y-2.5 text-sm text-charcoal-700">
          <li className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-rose-600" /> hello@kanakacademy.example
          </li>
          <li className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-rose-600" /> +91 00000 00000
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 text-rose-600" /> Academy address to be configured
          </li>
        </ul>
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
      {columns.map((c) => (
        <div key={c.title}>
          <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-500">{c.title}</h4>
          <ul className="mt-4 space-y-2.5">
            {c.links.map((l) => (
              <li key={l.to + l.label}>
                <Link to={l.to} className="text-sm text-charcoal-700 transition-colors hover:text-rose-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-ivory-200">
      <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-charcoal-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Kanak Beauty Academy. All rights reserved.</p>
        <p>Contact details, imagery and testimonials shown during development are placeholders.</p>
      </div>
    </div>
  </footer>
);
