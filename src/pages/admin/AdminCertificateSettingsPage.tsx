import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useAdminTrainers, useCertificateSettings, useCertificateSettingsMutations } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { Certificate, CertificateImageKind, CertificateSettingsUpdate } from '@/types';
import { CertificatePreview } from '@/components/shared/CertificatePreview';
import { ImagePickerField } from '@/components/shared/ImagePickerField';
import { Button, ErrorState, FormField, InlineAlert, Input, LoadingSkeleton, PageHeader, Select, useToast } from '@/components/ui';

const schema = z.object({
  organisationName: z.string().trim().min(2, 'At least 2 characters').max(120),
  numberPrefix: z.string().trim().regex(/^[A-Za-z]{2,6}$/, 'Use 2-6 letters, e.g. KBS'),
  appreciationText: z.string().trim().max(200),
  signatoryName: z.string().trim().max(120),
  signatoryTitle: z.string().trim().max(120),
  registrationLabel: z.string().trim().max(40),
  registrationNumber: z.string().trim().max(60),
});
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS = Object.keys(schema.shape) as Array<keyof FormValues>;

const IMAGES: Array<{ kind: CertificateImageKind; field: 'signatorySignature' | 'signatoryStamp' | 'registrationLogo'; label: string; hint: string }> = [
  { kind: 'stamp', field: 'signatoryStamp', label: 'Academy stamp', hint: 'The rubber stamp, printed behind the signature. A stamp image that already contains the signature works too.' },
  { kind: 'signature', field: 'signatorySignature', label: 'Signatory signature', hint: 'Printed over the stamp, above the signatory name. Transparent PNG works best.' },
  { kind: 'registration-logo', field: 'registrationLogo', label: 'Registration logo', hint: 'Small logo above the registration number, e.g. the MSME/Udyam logo.' },
];

const AdminCertificateSettingsPage = () => {
  const settings = useCertificateSettings();
  const trainers = useAdminTrainers();
  const { update, upload, remove } = useCertificateSettingsMutations();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<CertificateImageKind | null>(null);
  const [previewTrainerId, setPreviewTrainerId] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (settings.data) reset(settings.data);
  }, [settings.data, reset]);

  const values = watch();
  const trainerList = trainers.data ?? [];
  const previewTrainer = trainerList.find((t) => t.id === previewTrainerId) ?? trainerList.find((t) => t.signatureImage) ?? trainerList[0];

  // Sample certificate showing exactly what the next issued certificate will print.
  const sample: Certificate | null = useMemo(() => {
    const s = settings.data;
    if (!s) return null;
    const prefix = (values.numberPrefix || s.numberPrefix || 'KBS').toUpperCase();
    return {
      id: 'preview',
      certificateNumber: `${prefix}-AHC-20261025-1C9FAF-032`,
      studentId: 'preview',
      studentName: 'Simran Kaur',
      courseId: 'preview',
      courseTitle: 'Advance Hairstyle Class',
      batchId: null,
      completionDate: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      issuedBy: values.organisationName || s.organisationName,
      status: 'issued',
      revokedAt: null,
      revokedReason: null,
      verificationUrl: '',
      design: {
        durationLabel: '1 Month',
        trainerName: previewTrainer?.name ?? 'Trainer name',
        trainerTitle: previewTrainer?.title ?? 'Trainer title',
        trainerSignature: previewTrainer?.signatureImage ?? null,
        signatoryName: values.signatoryName ?? s.signatoryName,
        signatoryTitle: values.signatoryTitle ?? s.signatoryTitle,
        signatorySignature: s.signatorySignature,
        signatoryStamp: s.signatoryStamp,
        registrationLabel: values.registrationLabel ?? s.registrationLabel,
        registrationNumber: values.registrationNumber ?? s.registrationNumber,
        registrationLogo: s.registrationLogo,
        organisationName: values.organisationName || s.organisationName,
        appreciationText: values.appreciationText ?? s.appreciationText,
      },
    };
  }, [settings.data, values.numberPrefix, values.organisationName, values.signatoryName, values.signatoryTitle, values.registrationLabel, values.registrationNumber, values.appreciationText, previewTrainer]);

  if (settings.isLoading) return <LoadingSkeleton variant="page" />;
  if (settings.error || !settings.data) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;
  const s = settings.data;

  const save = async (v: FormValues) => {
    setServerError(null);
    try {
      const payload: CertificateSettingsUpdate = { ...v, numberPrefix: v.numberPrefix.toUpperCase() };
      await update.mutateAsync(payload);
      toast.success('Certificate settings saved', 'They apply to certificates issued from now on.');
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if ((FIELD_KEYS as string[]).includes(field)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const changeImage = async (kind: CertificateImageKind, file: File | null) => {
    setBusyKind(kind);
    try {
      if (file) await upload.mutateAsync({ kind, file });
      else await remove.mutateAsync(kind);
      toast.success(file ? 'Image uploaded' : 'Image removed');
    } catch (e) {
      toast.error('Could not update the image', getErrorMessage(e));
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate settings"
        description="The authorised signatory, stamp and registration details printed on every certificate. Trainer signatures are added on each trainer's profile. Changes apply to certificates issued from now on; issued certificates keep what they were issued with."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <form onSubmit={handleSubmit(save)} className="card space-y-4 p-6" noValidate>
            <h2 className="font-display text-2xl font-semibold">Signatory &amp; text</h2>
            {serverError ? <InlineAlert tone="danger">{serverError}</InlineAlert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Signatory name" htmlFor="cs-name" error={errors.signatoryName?.message} hint="e.g. Shreekant Mehta">
                <Input id="cs-name" invalid={!!errors.signatoryName} {...register('signatoryName')} />
              </FormField>
              <FormField label="Signatory title" htmlFor="cs-title" error={errors.signatoryTitle?.message}>
                <Input id="cs-title" invalid={!!errors.signatoryTitle} {...register('signatoryTitle')} />
              </FormField>
              <FormField label="Organisation name" htmlFor="cs-org" error={errors.organisationName?.message} hint="Printed after the duration and under each name" required>
                <Input id="cs-org" invalid={!!errors.organisationName} {...register('organisationName')} />
              </FormField>
              <FormField label="Certificate number prefix" htmlFor="cs-prefix" error={errors.numberPrefix?.message} hint={`Numbers look like ${(values.numberPrefix || s.numberPrefix).toUpperCase()}-AHC-20261025-1C9FAF-032`} required>
                <Input id="cs-prefix" className="uppercase" maxLength={6} invalid={!!errors.numberPrefix} {...register('numberPrefix')} />
              </FormField>
              <FormField label="Registration label" htmlFor="cs-reg-label" error={errors.registrationLabel?.message} hint="e.g. Udyam No.">
                <Input id="cs-reg-label" invalid={!!errors.registrationLabel} {...register('registrationLabel')} />
              </FormField>
              <FormField label="Registration number" htmlFor="cs-reg" error={errors.registrationNumber?.message} hint="e.g. UDYAM-JH-18-0033345">
                <Input id="cs-reg" invalid={!!errors.registrationNumber} {...register('registrationNumber')} />
              </FormField>
              <FormField label="Appreciation line" htmlFor="cs-appreciation" error={errors.appreciationText?.message} className="sm:col-span-2">
                <Input id="cs-appreciation" invalid={!!errors.appreciationText} {...register('appreciationText')} />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
                Save settings
              </Button>
            </div>
          </form>

          <div className="card space-y-5 p-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Stamp &amp; signature images</h2>
              <p className="mt-1 text-sm text-charcoal-500">Saved as soon as you upload. Visible only to admins and on students' own certificates.</p>
            </div>
            {IMAGES.map((img) => (
              <ImagePickerField
                key={img.kind}
                label={img.label}
                hint={img.hint}
                current={s[img.field]}
                busy={busyKind === img.kind}
                onPick={(file) => void changeImage(img.kind, file)}
                onRemove={() => void changeImage(img.kind, null)}
                onError={(message) => toast.error('Image not added', message)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Preview</h2>
            {trainerList.length > 0 ? (
              <label className="text-sm">
                <span className="mb-1 block text-charcoal-500">Trainer shown</span>
                <Select value={previewTrainer?.id ?? ''} onChange={(e) => setPreviewTrainerId(e.target.value)} aria-label="Trainer shown in the preview">
                  {trainerList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.signatureImage ? '' : ' (no signature yet)'}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
          </div>
          {sample ? <CertificatePreview certificate={sample} /> : null}
          <p className="text-xs text-charcoal-500">Sample student and course. Real certificates are issued automatically when a batch is completed, to every member whose payment was received (or who was enrolled by an admin).</p>
        </div>
      </div>
    </div>
  );
};

export default AdminCertificateSettingsPage;
