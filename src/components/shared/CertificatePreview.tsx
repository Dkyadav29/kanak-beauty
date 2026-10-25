import type { CSSProperties, ReactNode } from 'react';
import type { Certificate } from '@/types';
import { cn, formatDate } from '@/lib/utils';

/**
 * The Kanak certificate: the academy's artwork (public/certificate/template.jpg, A4 landscape)
 * with the student, course, trainer and signatory printed on top. Positions are fractions of
 * the page measured from the original design, so the on-screen and printed versions match.
 * Text sizes use container units (cqw) so the layout scales with the card width.
 */
const MAROON = '#5b1a24';
const SERIF = 'Georgia, "DejaVu Serif", "Times New Roman", serif';
const SANS = 'Arial, "Helvetica Neue", "DejaVu Sans", sans-serif';

/** Absolutely placed block, centred on (x%, y%) of the page. */
const At = ({ x, y, w, children, style }: { x: number; y: number; w: number; children: ReactNode; style?: CSSProperties }) => (
  <div className="absolute text-center" style={{ left: `${x - w / 2}%`, top: `${y}%`, width: `${w}%`, transform: 'translateY(-50%)', ...style }}>
    {children}
  </div>
);

const Img = ({ src, alt, box }: { src: string | null | undefined; alt: string; box: { x: number; y: number; w: number; h: number } }) =>
  src ? (
    <img
      src={src}
      alt={alt}
      className="absolute object-contain"
      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
      draggable={false}
    />
  ) : null;

export const CertificatePreview = ({ certificate, className }: { certificate: Certificate; className?: string; printable?: boolean }) => {
  const d = certificate.design;
  const org = d?.organisationName || 'Kanak Beauty Service';
  const revoked = certificate.status === 'revoked';
  const issued = formatDate(certificate.issuedAt, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className={cn('certificate relative w-full overflow-hidden bg-[#f6efe4] shadow-soft [container-type:inline-size]', className)}
      style={{ aspectRatio: '2339 / 1654' }}
      role="img"
      aria-label={`Certificate ${certificate.certificateNumber} for ${certificate.studentName}, ${certificate.courseTitle}`}
    >
      <img src="/certificate/template.jpg" alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />

      {/* Student name, above the gold line */}
      <At x={50} y={52.6} w={64}>
        <p className="truncate font-bold leading-none" style={{ fontFamily: SERIF, color: MAROON, fontSize: '2.75cqw' }}>
          {certificate.studentName}
        </p>
      </At>

      {/* Course box */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-[0.6cqw] border text-center"
        style={{ left: '27.9%', top: '62%', width: '44.2%', height: '7.8%', borderColor: '#c9a24b', background: 'rgba(255,250,242,0.55)' }}
      >
        <p className="w-[96%] truncate font-bold uppercase leading-tight tracking-[0.02em]" style={{ fontFamily: SANS, color: MAROON, fontSize: '1.7cqw' }}>
          {certificate.courseTitle}
        </p>
        <p className="mt-[0.25cqw] leading-tight text-[#222]" style={{ fontFamily: SANS, fontSize: '1.1cqw' }}>
          {d?.durationLabel ? <>Duration: {d.durationLabel}&nbsp;&nbsp;|&nbsp;&nbsp;</> : null}
          {org}
        </p>
      </div>

      {/* Appreciation */}
      {d?.appreciationText !== '' ? (
        <At x={50} y={72.7} w={31}>
          <p className="leading-snug text-[#222]" style={{ fontFamily: SANS, fontSize: '1.16cqw' }}>
            {d?.appreciationText ?? 'We appreciate the dedication, hard work and passion shown during the course.'}
          </p>
        </At>
      ) : null}

      {/* Trainer: signature, line, name, title, organisation */}
      <Img src={d?.trainerSignature} alt={`Signature of ${d?.trainerName ?? 'the trainer'}`} box={{ x: 33.5, y: 74.3, w: 16, h: 6.2 }} />
      <div className="absolute" style={{ left: '30.2%', top: '80.4%', width: '22.6%', height: '0.12%', background: '#b8892f' }} />
      <At x={41.5} y={82.3} w={24}>
        <p className="truncate font-bold leading-none" style={{ fontFamily: SERIF, color: MAROON, fontSize: '1.3cqw' }}>
          {d?.trainerName || ' '}
        </p>
      </At>
      <At x={41.5} y={85.1} w={24}>
        <p className="leading-tight text-[#222]" style={{ fontFamily: SANS, fontSize: '1.02cqw' }}>
          {d?.trainerTitle}
          {d?.trainerName ? <span className="block">{org}</span> : null}
        </p>
      </At>

      {/* Issue date (the "ISSUE DATE" label is part of the artwork) */}
      <At x={22} y={85.4} w={14}>
        <p className="leading-none text-[#222]" style={{ fontFamily: SANS, fontSize: '1.08cqw' }}>
          {issued}
        </p>
      </At>

      {/* Authorised signatory: stamp + signature, line, name, title, organisation, registration */}
      <Img src={d?.signatoryStamp} alt="Academy stamp" box={{ x: 70.8, y: 73.4, w: 14.6, h: 7.2 }} />
      <Img src={d?.signatorySignature} alt={`Signature of ${d?.signatoryName ?? 'the signatory'}`} box={{ x: 72.5, y: 74.6, w: 11.5, h: 5.6 }} />
      <div className="absolute" style={{ left: '66.7%', top: '80.8%', width: '23.5%', height: '0.12%', background: '#b8892f' }} />
      <At x={78.4} y={82.8} w={26}>
        <p className="truncate font-bold leading-none" style={{ fontFamily: SERIF, color: MAROON, fontSize: '1.3cqw' }}>
          {d?.signatoryName || ' '}
        </p>
      </At>
      <At x={78.4} y={85.6} w={26}>
        <p className="leading-tight text-[#222]" style={{ fontFamily: SANS, fontSize: '1.02cqw' }}>
          {d?.signatoryTitle}
          {d?.signatoryName ? <span className="block">{org}</span> : null}
        </p>
      </At>
      <Img src={d?.registrationLogo} alt="" box={{ x: 74.6, y: 88.9, w: 3.4, h: 3.6 }} />
      {d?.registrationNumber ? (
        <At x={78.4} y={93.7} w={26}>
          <p className="font-bold leading-none text-[#222]" style={{ fontFamily: SANS, fontSize: '0.76cqw' }}>
            {d.registrationLabel ? `${d.registrationLabel}: ` : ''}
            {d.registrationNumber}
          </p>
        </At>
      ) : null}

      {/* Certificate number */}
      <At x={50} y={96} w={40}>
        <p className="leading-none text-[#222]" style={{ fontFamily: SANS, fontSize: '0.86cqw' }}>
          Certificate No.: {certificate.certificateNumber}
        </p>
      </At>

      {revoked ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-12 rounded-xl border-4 border-red-600/70 bg-white/40 px-6 py-2 font-sans text-[4cqw] font-black uppercase tracking-widest text-red-600/80">
            Revoked
          </span>
        </div>
      ) : null}
    </div>
  );
};
