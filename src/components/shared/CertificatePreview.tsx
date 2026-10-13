import type { Certificate } from '@/types';
import { env } from '@/config/env';
import { cn, formatDate } from '@/lib/utils';

/**
 * Printable certificate layout. The official PDF is produced by the backend or a
 * trusted certificate service; this preview renders the same data for on-screen
 * display and browser printing.
 */
export const CertificatePreview = ({ certificate, className, printable }: { certificate: Certificate; className?: string; printable?: boolean }) => {
  const verifyUrl = `${env.publicSiteUrl}${certificate.verificationUrl}`;
  const revoked = certificate.status === 'revoked';
  return (
    <div
      className={cn(
        'relative aspect-[1.414/1] w-full overflow-hidden rounded-2xl border border-gold-200 bg-[#fffdf8] text-charcoal-900 shadow-soft',
        printable && 'rounded-none border-0 shadow-none',
        className,
      )}
      role="img"
      aria-label={`Certificate ${certificate.certificateNumber} for ${certificate.studentName}`}
    >
      {/* decorative frame */}
      <div className="pointer-events-none absolute inset-[3%] rounded-xl border-[3px] border-gold-400" />
      <div className="pointer-events-none absolute inset-[4.2%] rounded-lg border border-gold-300" />
      <div className="pointer-events-none absolute -left-[12%] -top-[22%] h-[55%] w-[55%] rounded-full bg-rose-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-[25%] -right-[12%] h-[60%] w-[60%] rounded-full bg-gold-100/70 blur-3xl" />

      {revoked ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-12 rounded-xl border-4 border-red-600/70 px-6 py-2 font-sans text-[clamp(1rem,4cqw,2.5rem)] font-black uppercase tracking-widest text-red-600/70">Revoked</span>
        </div>
      ) : null}

      <div className="absolute inset-[9%] flex flex-col items-center justify-between text-center [container-type:inline-size]">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="flex h-[clamp(1.5rem,5cqw,2.75rem)] w-[clamp(1.5rem,5cqw,2.75rem)] items-center justify-center rounded-lg bg-rose-600 text-white">
              <svg viewBox="0 0 64 64" className="h-[60%] w-[60%]" aria-hidden>
                <path d="M20 16v32M20 32l20-16M20 32l20 16" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            <span className="text-left leading-none">
              <span className="block font-display text-[clamp(0.9rem,3.2cqw,1.6rem)] font-bold">Kanak</span>
              <span className="block text-[clamp(0.4rem,1.3cqw,0.65rem)] font-semibold uppercase tracking-[0.22em] text-gold-700">Beauty Academy</span>
            </span>
          </div>
          <p className="mt-[3cqw] text-[clamp(0.5rem,1.6cqw,0.8rem)] font-semibold uppercase tracking-[0.3em] text-gold-700">Certificate of Completion</p>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-[clamp(0.55rem,1.7cqw,0.85rem)] text-charcoal-500">This certifies that</p>
          <p className="mt-[1cqw] font-display text-[clamp(1.3rem,5.5cqw,3rem)] font-semibold leading-tight text-rose-700">{certificate.studentName}</p>
          <div className="my-[1.2cqw] h-px w-[40%] bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
          <p className="text-[clamp(0.55rem,1.7cqw,0.85rem)] text-charcoal-500">has successfully completed the professional programme</p>
          <p className="mt-[1cqw] font-display text-[clamp(0.9rem,3.2cqw,1.7rem)] font-semibold">{certificate.courseTitle}</p>
          <p className="mt-[1cqw] text-[clamp(0.5rem,1.5cqw,0.75rem)] text-charcoal-500">
            Completed on {formatDate(certificate.completionDate, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 items-end gap-2 text-left text-[clamp(0.42rem,1.3cqw,0.68rem)]">
          <div>
            <p className="font-semibold uppercase tracking-wider text-charcoal-500">Certificate No.</p>
            <p className="font-mono font-semibold">{certificate.certificateNumber}</p>
            <p className="mt-[0.6cqw] text-charcoal-500">Issued {formatDate(certificate.issuedAt)}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-[clamp(2rem,8cqw,4.5rem)] w-[clamp(2rem,8cqw,4.5rem)] items-center justify-center rounded-full border-[3px] border-gold-400 bg-gold-50">
              <span className="font-display text-[clamp(0.7rem,2.6cqw,1.4rem)] font-bold text-gold-800">KBA</span>
            </div>
            <p className="mt-[0.5cqw] text-center text-charcoal-500">Academy seal</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[clamp(0.8rem,2.6cqw,1.3rem)] italic text-charcoal-800">{certificate.issuedBy}</p>
            <div className="ml-auto mt-[0.3cqw] h-px w-[70%] bg-charcoal-800" />
            <p className="mt-[0.5cqw] font-semibold uppercase tracking-wider text-charcoal-500">Authorised issuer</p>
            <p className="mt-[0.6cqw] break-all text-charcoal-500">Verify: {verifyUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
