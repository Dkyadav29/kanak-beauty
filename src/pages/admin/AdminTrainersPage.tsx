import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PenLine, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import { ImagePickerField } from '@/components/shared/ImagePickerField';
import { useAdminTrainers, useTrainerMutations } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { AdminTrainer, TrainerUpsertRequest } from '@/types';
import { Badge, Button, Checkbox, DataTable, Dialog, FormField, InlineAlert, Input, PageHeader, SearchAndFilters, Textarea, useToast, type Column } from '@/components/ui';

const MOBILE_RE = /^\+?[0-9 ]{10,15}$/;

/** "Bridal, HD,  , bridal" -> ["Bridal", "HD"] (trimmed, blanks and case-insensitive duplicates dropped). */
const parseSkills = (raw: string) => {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
};

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(120),
  title: z.string().trim().min(2, 'e.g. Senior Makeup Educator').max(120),
  mobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid mobile number (10 to 15 digits, optional +)'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  skills: z.string().refine((v) => parseSkills(v).length > 0, 'Add at least one skill'),
  bio: z.string().trim().max(2000),
  avatarUrl: z.union([z.literal(''), z.string().trim().regex(/^https?:\/\/\S+$/i, 'Enter a valid http(s) image URL')]),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS: Array<keyof FormValues> = ['name', 'title', 'mobile', 'email', 'bio', 'avatarUrl', 'isActive'];

const toValues = (t: AdminTrainer | null): FormValues => ({
  name: t?.name ?? '',
  title: t?.title ?? '',
  mobile: t?.mobile ?? '',
  email: t?.email ?? '',
  skills: t?.specialities.join(', ') ?? '',
  bio: t?.bio ?? '',
  avatarUrl: t?.avatarUrl ?? '',
  isActive: t?.isActive ?? true,
});

const toPayload = (v: FormValues): TrainerUpsertRequest => ({
  name: v.name.trim(),
  title: v.title.trim(),
  mobile: v.mobile.trim(),
  email: v.email.trim(),
  bio: v.bio.trim(),
  avatarUrl: v.avatarUrl.trim() || null,
  specialities: parseSkills(v.skills),
  isActive: v.isActive,
});

/** Same body the API needs on every PUT, built from an existing row (used by the activate/deactivate action). */
const rowPayload = (t: AdminTrainer, isActive: boolean): TrainerUpsertRequest => ({
  name: t.name,
  title: t.title,
  mobile: t.mobile,
  email: t.email,
  bio: t.bio,
  avatarUrl: t.avatarUrl,
  specialities: t.specialities,
  isActive,
});

const TrainerFormDialog = ({ open, trainer, onClose }: { open: boolean; trainer: AdminTrainer | null; onClose: () => void }) => {
  const { create, update, uploadSignature, removeSignature } = useTrainerMutations();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  // Signature changes are applied after the trainer itself is saved.
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureRemoved, setSignatureRemoved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(trainer) });

  useEffect(() => {
    if (!open) return;
    reset(toValues(trainer));
    setServerError(null);
    setSignatureFile(null);
    setSignatureRemoved(false);
  }, [open, trainer, reset]);

  const submit = async (v: FormValues) => {
    setServerError(null);
    try {
      const saved = trainer ? await update.mutateAsync({ id: trainer.id, payload: toPayload(v) }) : await create.mutateAsync(toPayload(v));
      if (signatureFile) await uploadSignature.mutateAsync({ id: saved.id, file: signatureFile });
      else if (signatureRemoved && trainer?.signatureImage) await removeSignature.mutateAsync(saved.id);
      toast.success(trainer ? 'Trainer updated' : 'Trainer added', v.name.trim());
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          const key = field === 'specialities' ? 'skills' : field;
          if ([...FIELD_KEYS, 'skills'].includes(key as keyof FormValues)) setError(key as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const formId = 'trainer-form';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={trainer ? 'Edit trainer' : 'Add trainer'}
      description="Mobile number and email are visible to admins only. Name, title, skills, bio and photo appear on the public website."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {trainer ? 'Save changes' : 'Add trainer'}
          </Button>
        </>
      }
    >
      {serverError ? (
        <InlineAlert tone="danger" className="mb-4">
          {serverError}
        </InlineAlert>
      ) : null}
      <form id={formId} onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Full name" htmlFor="tr-name" error={errors.name?.message} required>
          <Input id="tr-name" autoComplete="off" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Title" htmlFor="tr-title" error={errors.title?.message} hint="Printed under the signature on certificates, e.g. Hairstyle Trainer & Educator" required>
          <Input id="tr-title" invalid={!!errors.title} {...register('title')} />
        </FormField>
        <FormField label="Mobile number" htmlFor="tr-mobile" error={errors.mobile?.message} required>
          <Input id="tr-mobile" type="tel" inputMode="tel" placeholder="+91 98765 43210" invalid={!!errors.mobile} {...register('mobile')} />
        </FormField>
        <FormField label="Email" htmlFor="tr-email" error={errors.email?.message} hint="Optional">
          <Input id="tr-email" type="email" invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Skills" htmlFor="tr-skills" error={errors.skills?.message} hint="Separate with commas, e.g. Bridal makeup, HD makeup, Hair styling" required className="sm:col-span-2">
          <Input id="tr-skills" invalid={!!errors.skills} {...register('skills')} />
        </FormField>
        <FormField label="Bio" htmlFor="tr-bio" error={errors.bio?.message} hint="Optional, shown on the About page" className="sm:col-span-2">
          <Textarea id="tr-bio" rows={3} invalid={!!errors.bio} {...register('bio')} />
        </FormField>
        <FormField label="Photo URL" htmlFor="tr-avatar" error={errors.avatarUrl?.message} hint="Optional direct link to a photo" className="sm:col-span-2">
          <Input id="tr-avatar" type="url" placeholder="https://…" invalid={!!errors.avatarUrl} {...register('avatarUrl')} />
        </FormField>
        <ImagePickerField
          className="sm:col-span-2"
          label="Signature for certificates"
          hint="Printed above this trainer's name on every certificate of their batches. Use a PNG with a transparent background; it is never shown on the public website. Changing it does not alter certificates already issued."
          current={trainer?.signatureImage}
          pending={signatureFile}
          removed={signatureRemoved}
          onPick={(file) => {
            setSignatureFile(file);
            setSignatureRemoved(false);
          }}
          onRemove={() => {
            setSignatureFile(null);
            setSignatureRemoved(true);
          }}
          onError={(message) => toast.error('Signature not added', message)}
        />
        <Checkbox
          id="tr-active"
          className="sm:col-span-2"
          label="Active"
          description="Only active trainers can be assigned to new batches and live sessions."
          {...register('isActive')}
        />
      </form>
    </Dialog>
  );
};

const AdminTrainersPage = () => {
  const trainers = useAdminTrainers();
  const { update } = useTrainerMutations();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AdminTrainer | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = (t: AdminTrainer | null) => {
    setEditing(t);
    setFormOpen(true);
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const status = filters.status;
    return (trainers.data ?? []).filter(
      (t) =>
        (!status || status === 'all' || (status === 'active') === t.isActive) &&
        (!q || [t.name, t.title, t.mobile, t.email, ...t.specialities].some((v) => v.toLowerCase().includes(q))),
    );
  }, [trainers.data, search, filters]);

  const toggle = async (t: AdminTrainer) => {
    try {
      await update.mutateAsync({ id: t.id, payload: rowPayload(t, !t.isActive) });
      toast.success(t.isActive ? 'Trainer deactivated' : 'Trainer activated', t.name);
    } catch (e) {
      toast.error(t.isActive ? 'Could not deactivate' : 'Could not activate', getErrorMessage(e));
    }
  };

  const columns: Column<AdminTrainer>[] = [
    {
      key: 'trainer',
      header: 'Trainer',
      render: (t) => (
        <div>
          <p className="font-medium text-charcoal-900">{t.name}</p>
          <p className="text-xs text-charcoal-500">{t.title}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (t) => (
        <div className="text-sm">
          <p className="whitespace-nowrap text-charcoal-800">{t.mobile || <span className="text-amber-700">Mobile missing</span>}</p>
          {t.email ? <p className="text-xs text-charcoal-500">{t.email}</p> : null}
        </div>
      ),
      hideBelow: 'sm',
    },
    {
      key: 'skills',
      header: 'Skills',
      render: (t) => (
        <div className="flex max-w-xs flex-wrap gap-1">
          {t.specialities.map((s) => (
            <Badge key={s} tone="info">
              {s}
            </Badge>
          ))}
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'signature',
      header: 'Signature',
      render: (t) =>
        t.signatureImage ? (
          <img src={t.signatureImage} alt={`Signature of ${t.name}`} className="h-8 max-w-[7rem] object-contain" />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <PenLine className="h-3.5 w-3.5" /> Not uploaded
          </span>
        ),
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge tone={t.isActive ? 'success' : 'neutral'} dot>
          {t.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openForm(t)}>
            Edit
          </Button>
          <Button size="icon" variant="ghost" aria-label={t.isActive ? `Deactivate ${t.name}` : `Activate ${t.name}`} disabled={update.isPending} onClick={() => void toggle(t)}>
            {t.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trainers"
        description="Instructors who teach courses, batches and live sessions. A trainer with open batches or upcoming sessions cannot be deactivated."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add trainer
          </Button>
        }
      />
      <SearchAndFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, mobile, email or skill…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
        values={filters}
        onFilterChange={(key, value) => setFilters((f) => ({ ...f, [key]: value }))}
        onReset={() => {
          setSearch('');
          setFilters({});
        }}
        className="mb-4"
      />
      <DataTable
        columns={columns}
        rows={trainers.data ? rows : undefined}
        rowKey={(t) => t.id}
        isLoading={trainers.isLoading}
        error={trainers.error}
        onRetry={() => void trainers.refetch()}
        onRowClick={(t) => openForm(t)}
        emptyTitle="No trainers found"
        emptyDescription="Add a trainer before creating batches; every batch needs one."
        emptyAction={
          <Button variant="secondary" size="sm" onClick={() => openForm(null)}>
            Add trainer
          </Button>
        }
        caption="Trainers"
      />

      <TrainerFormDialog open={formOpen} trainer={editing} onClose={() => setFormOpen(false)} />
    </div>
  );
};

export default AdminTrainersPage;
