import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Printer, Share2 } from 'lucide-react';
import { useStudentCertificate } from '@/hooks/useStudent';
import { env } from '@/config/env';
import { formatDate } from '@/lib/utils';
import { CertificatePreview } from '@/components/shared/CertificatePreview';
import { Button, ErrorState, InlineAlert, KeyValue, LinkButton, LoadingSkeleton, StatusBadge, useToast } from '@/components/ui';

const CertificateViewPage = () => {
  const { certificateId } = useParams();
  const [params] = useSearchParams();
  const certificate = useStudentCertificate(certificateId);
  const toast = useToast();

  // ?print=1 opens the browser print dialog (Save as PDF) once the certificate has loaded.
  useEffect(() => {
    if (params.get('print') === '1' && certificate.data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [params, certificate.data]);

  if (certificate.isLoading) return <LoadingSkeleton variant="page" />;
  if (certificate.error || !certificate.data) return <ErrorState error={certificate.error} onRetry={() => void certificate.refetch()} />;
  const c = certificate.data;
  const verifyUrl = `${env.publicSiteUrl}${c.verificationUrl}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `Kanak certificate ${c.certificateNumber}`, url: verifyUrl });
      else {
        await navigator.clipboard.writeText(verifyUrl);
        toast.success('Verification link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/student/certificates" className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-500 hover:text-rose-700">
          <ArrowLeft className="h-4 w-4" /> My certificates
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void share()} leftIcon={<Share2 className="h-4 w-4" />}>
            Share verification link
          </Button>
          <Button onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
            Download / Print PDF
          </Button>
        </div>
      </div>
      {c.status === 'revoked' ? (
        <InlineAlert tone="danger" className="print:hidden">
          This certificate was revoked on {formatDate(c.revokedAt)}. Reason: {c.revokedReason}
        </InlineAlert>
      ) : null}
      <div className="print-area mx-auto max-w-4xl">
        <CertificatePreview certificate={c} />
      </div>
      <div className="card mx-auto max-w-4xl p-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Certificate details</h2>
          <StatusBadge status={c.status} />
        </div>
        <KeyValue
          className="mt-4"
          items={[
            { label: 'Certificate number', value: <span className="font-mono">{c.certificateNumber}</span> },
            { label: 'Student', value: c.studentName },
            { label: 'Course', value: c.courseTitle },
            { label: 'Completion date', value: formatDate(c.completionDate) },
            { label: 'Issued on', value: formatDate(c.issuedAt) },
            { label: 'Issuing academy', value: c.issuedBy },
            { label: 'Verification URL', value: <a href={verifyUrl} className="break-all font-medium text-rose-700 hover:underline">{verifyUrl}</a> },
          ]}
        />
        <div className="mt-5">
          <LinkButton to={c.verificationUrl} variant="secondary" leftIcon={<BadgeCheck className="h-4 w-4" />}>
            Verify this certificate
          </LinkButton>
        </div>
        <p className="mt-4 text-xs text-charcoal-500">The official PDF is produced by the academy's certificate service. Use Print and choose "Save as PDF" for a local copy of this authorised preview.</p>
      </div>
    </div>
  );
};

export default CertificateViewPage;
