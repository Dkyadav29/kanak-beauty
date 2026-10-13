import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, SearchCheck, ShieldX } from 'lucide-react';
import { useVerifyCertificate } from '@/hooks/useCatalog';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button, ErrorState, FormField, Input, KeyValue, LoadingSkeleton, SectionHeading, StatusBadge } from '@/components/ui';

const VerifyCertificatePage = () => {
  const { certificateNumber } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(certificateNumber ?? '');
  const result = useVerifyCertificate(certificateNumber);

  return (
    <div className="container-x max-w-3xl py-12 lg:py-16">
      <SectionHeading eyebrow="Certificate verification" title="Verify a Kanak certificate" description="Enter the certificate number printed on the certificate. Verification is performed against the academy's official records; revoked certificates are reported as invalid." />
      <form
        className="card mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim().toUpperCase())}`);
        }}
      >
        <FormField label="Certificate number" htmlFor="certno" className="flex-1">
          <Input id="certno" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. KBA-2025-00118" autoComplete="off" />
        </FormField>
        <Button type="submit" leftIcon={<SearchCheck className="h-4 w-4" />}>
          Verify
        </Button>
      </form>

      {certificateNumber ? (
        <div className="mt-8">
          {result.isLoading ? (
            <LoadingSkeleton variant="page" />
          ) : result.error ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : result.data ? (
            <div className={`card overflow-hidden border-2 ${result.data.valid ? 'border-emerald-200' : 'border-red-200'}`}>
              <div className={`flex items-center gap-3 px-6 py-4 ${result.data.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {result.data.valid ? <BadgeCheck className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}
                <div>
                  <p className="font-display text-xl font-semibold">{result.data.valid ? 'Valid certificate' : result.data.status === 'revoked' ? 'Certificate revoked' : 'Certificate not found'}</p>
                  <p className="text-xs">Checked {formatDateTime(result.data.checkedAt)}</p>
                </div>
                <StatusBadge status={result.data.status} className="ml-auto" />
              </div>
              {result.data.certificate ? (
                <div className="p-6">
                  <KeyValue
                    items={[
                      { label: 'Certificate number', value: <span className="font-mono">{result.data.certificate.certificateNumber}</span> },
                      { label: 'Student', value: result.data.certificate.studentName },
                      { label: 'Course', value: result.data.certificate.courseTitle },
                      { label: 'Completion date', value: formatDate(result.data.certificate.completionDate) },
                      { label: 'Issued on', value: formatDate(result.data.certificate.issuedAt) },
                      { label: 'Issued by', value: result.data.certificate.issuedBy },
                    ]}
                  />
                  {!result.data.valid ? <p className="mt-5 text-sm text-red-700">This certificate has been revoked by the academy and should not be accepted as valid.</p> : null}
                </div>
              ) : (
                <div className="p-6 text-sm text-charcoal-700">No certificate with this number exists in our records. Check the number carefully; it is case-insensitive.</div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default VerifyCertificatePage;
