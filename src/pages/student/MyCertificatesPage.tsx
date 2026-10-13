import { Link } from 'react-router-dom';
import { Award, BadgeCheck, Download, Eye } from 'lucide-react';
import { useStudentCertificates } from '@/hooks/useStudent';
import { formatDate } from '@/lib/utils';
import type { Certificate } from '@/types';
import { CertificatePreview } from '@/components/shared/CertificatePreview';
import { EmptyState, ErrorState, InlineAlert, LinkButton, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/ui';

export const CertificateCard = ({ certificate }: { certificate: Certificate }) => (
  <article className="card flex flex-col overflow-hidden">
    <div className="bg-ivory-100 p-4">
      <CertificatePreview certificate={certificate} />
    </div>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold leading-snug">{certificate.courseTitle}</h3>
          <p className="text-sm text-charcoal-500">{certificate.studentName}</p>
        </div>
        <StatusBadge status={certificate.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-wider text-charcoal-500">Completed</dt>
          <dd className="mt-0.5 text-charcoal-800">{formatDate(certificate.completionDate)}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-charcoal-500">Certificate no.</dt>
          <dd className="mt-0.5 font-mono text-charcoal-800">{certificate.certificateNumber}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-charcoal-500">Issued by</dt>
          <dd className="mt-0.5 text-charcoal-800">{certificate.issuedBy}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-charcoal-500">Issued on</dt>
          <dd className="mt-0.5 text-charcoal-800">{formatDate(certificate.issuedAt)}</dd>
        </div>
      </dl>
      {certificate.status === 'revoked' ? <p className="mt-3 text-xs text-red-700">Revoked: {certificate.revokedReason}</p> : null}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <LinkButton to={`/student/certificates/${certificate.id}`} size="sm" leftIcon={<Eye className="h-4 w-4" />}>
          View
        </LinkButton>
        <LinkButton to={`/student/certificates/${certificate.id}?print=1`} size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />}>
          Download PDF
        </LinkButton>
        <Link to={certificate.verificationUrl} className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gold-800 hover:underline">
          <BadgeCheck className="h-3.5 w-3.5" /> Verify certificate
        </Link>
      </div>
    </div>
  </article>
);

const MyCertificatesPage = () => {
  const certificates = useStudentCertificates();
  return (
    <div>
      <PageHeader title="My Certificates" description="Certificates are issued by the academy once your course completion requirements are verified." />
      {certificates.isLoading ? (
        <LoadingSkeleton variant="cards" count={2} />
      ) : certificates.error ? (
        <ErrorState error={certificates.error} onRetry={() => void certificates.refetch()} />
      ) : (certificates.data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Award className="h-6 w-6" />} title="No certificates yet" description="Complete a course's requirements to earn your first Kanak certificate." action={<LinkButton to="/student/courses">Go to my courses</LinkButton>} />
      ) : (
        <div className="space-y-4">
          <InlineAlert tone="info">Each certificate carries a unique number and a public verification link. Revoked certificates remain listed for your records but fail verification.</InlineAlert>
          <div className="grid gap-6 lg:grid-cols-2">
            {certificates.data!.map((c) => (
              <CertificateCard key={c.id} certificate={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCertificatesPage;
