import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminCourses, useAdminTrainers } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { Batch, BatchUpsertRequest } from '@/types';
import { Button, Dialog, FormField, InlineAlert, Input, Select, Textarea } from '@/components/ui';

const schema = z
  .object({
    name: z.string().min(3, 'At least 3 characters').max(120, 'At most 120 characters'),
    courseId: z.string().min(1, 'Select a course'),
    trainerId: z.string().min(1, 'Select a trainer'),
    startDate: z.string().min(1, 'Select a start date'),
    endDate: z.string().min(1, 'Select an end date'),
    capacity: z.number({ invalid_type_error: 'Enter a number' }).int('Enter a whole number').min(1, 'At least 1 seat'),
    scheduleNote: z.string().max(240, 'At most 240 characters'),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'Must be on or after the start date', path: ['endDate'] });
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS: Array<keyof FormValues> = ['name', 'courseId', 'trainerId', 'startDate', 'endDate', 'capacity', 'scheduleNote'];

const toValues = (b?: Batch): FormValues => ({
  name: b?.name ?? '',
  courseId: b?.courseId ?? '',
  trainerId: b?.trainerId ?? '',
  startDate: b?.startDate ?? '',
  endDate: b?.endDate ?? '',
  capacity: b?.capacity ?? 20,
  scheduleNote: b?.scheduleNote ?? '',
});

/** Create / edit form for a batch. `onSubmit` should throw on failure; API field errors are mapped onto the form. */
export const BatchFormDialog = ({
  open,
  onClose,
  initial,
  onSubmit,
  title,
  submitLabel = 'Save batch',
}: {
  open: boolean;
  onClose: () => void;
  initial?: Batch;
  onSubmit: (payload: BatchUpsertRequest) => Promise<void>;
  title: string;
  submitLabel?: string;
}) => {
  const courses = useAdminCourses();
  const trainers = useAdminTrainers();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(initial) });

  useEffect(() => {
    if (open) {
      reset(toValues(initial));
      setServerError(null);
    }
  }, [open, initial, reset]);

  const submit = async (values: FormValues) => {
    setServerError(null);
    try {
      await onSubmit({ ...values, name: values.name.trim(), scheduleNote: values.scheduleNote.trim() });
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if ((FIELD_KEYS as string[]).includes(field)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const formId = 'batch-form';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Batches group enrolled students under one trainer and schedule. The batch code is generated automatically."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {submitLabel}
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
        <FormField label="Batch name" htmlFor="batch-name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="batch-name" placeholder="e.g. Weekend Bridal Makeup — Oct" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Course" htmlFor="batch-course" error={errors.courseId?.message} required>
          <Select id="batch-course" invalid={!!errors.courseId} {...register('courseId')}>
            <option value="">Select a course</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Trainer" htmlFor="batch-trainer" error={errors.trainerId?.message} required>
          <Select id="batch-trainer" invalid={!!errors.trainerId} {...register('trainerId')}>
            <option value="">Select a trainer</option>
            {trainers.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Start date" htmlFor="batch-start" error={errors.startDate?.message} required>
          <Input id="batch-start" type="date" invalid={!!errors.startDate} {...register('startDate')} />
        </FormField>
        <FormField label="End date" htmlFor="batch-end" error={errors.endDate?.message} required>
          <Input id="batch-end" type="date" invalid={!!errors.endDate} {...register('endDate')} />
        </FormField>
        <FormField label="Capacity" htmlFor="batch-capacity" error={errors.capacity?.message} hint="Maximum number of seats" required>
          <Input id="batch-capacity" type="number" min={1} step={1} invalid={!!errors.capacity} {...register('capacity', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Schedule note" htmlFor="batch-note" error={errors.scheduleNote?.message} hint="Shown to students, e.g. Sat & Sun, 10:00–13:00" className="sm:col-span-2">
          <Textarea id="batch-note" rows={2} invalid={!!errors.scheduleNote} {...register('scheduleNote')} />
        </FormField>
      </form>
    </Dialog>
  );
};
