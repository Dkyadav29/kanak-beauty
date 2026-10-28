import type { SiteContact } from '@/types';

export type ContactKind = 'email' | 'phone' | 'whatsapp' | 'address' | 'hours';

export interface ContactLine {
  kind: ContactKind;
  label: string;
  value: string;
  /** tel:/mailto:/WhatsApp/map link, when the line is actionable. */
  href?: string;
}

const digits = (phone: string) => phone.replace(/[^\d]/g, '');

/**
 * Company contact details (Admin > Branding) as display lines; blank fields are skipped so the
 * footer and Contact page never show placeholders.
 */
export const contactLines = (site: Partial<SiteContact> | undefined): ContactLine[] => {
  if (!site) return [];
  const lines: ContactLine[] = [];
  if (site.email) lines.push({ kind: 'email', label: 'Email', value: site.email, href: `mailto:${site.email}` });
  if (site.phone) lines.push({ kind: 'phone', label: site.whatsapp && digits(site.whatsapp) === digits(site.phone) ? 'Phone / WhatsApp' : 'Phone', value: site.phone, href: `tel:+${digits(site.phone)}` });
  if (site.whatsapp && digits(site.whatsapp) !== digits(site.phone ?? '')) {
    lines.push({ kind: 'whatsapp', label: 'WhatsApp', value: site.whatsapp, href: `https://wa.me/${digits(site.whatsapp)}` });
  }
  if (site.address) lines.push({ kind: 'address', label: 'Address', value: site.address, href: site.mapUrl || undefined });
  if (site.businessHours) lines.push({ kind: 'hours', label: 'Hours', value: site.businessHours });
  return lines;
};
