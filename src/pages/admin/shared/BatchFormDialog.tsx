import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminCourses, useAdminTrainers } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { Batch, BatchUpsertRequest } from '@/types';
import { Button, Checkbox, Dialog, FormField, InlineAlert, Input, Select, Textarea } from '@/components/ui';

const schema = z
  .object({
    name: z.string().min(3, 'At least 3 characters').max(120, 'At most 120 characters'),
    courseId: z.string().min(1, 'Select a course'),
    trainerId: z.string().min(1, 'Select a trainer'),
    startDate: z.string().min(1, 'Select a start date'),
    endDate: z.string().min(1, 'Select an end date'),
    startTime: z.string().min(1, 'Select a start time'),
    endTime: z.string().min(1, 'Select an end time'),
    capacity: z.number({ invalid_type_error: 'Enter a number' }).int('Enter a whole number').min(1, 'At least 1 seat'),
    scheduleNote: z.string().max(240, 'At most 240 characters'),
    enrollmentDeadline: z.string(),
    allowLateEnrollment: z.boolean(),
    deliveryMode: z.enum(['', 'live', 'recorded', 'hybrid']),
    meetLink: z
      .string()
      .trim()
      .max(500, 'At most 500 characters')
      .refine((v) => !v || /^https:\/\/meet\.google\.com\/\S+$/i.test(v), 'Enter a Google Meet link (https://meet.google.com/...)'),
    recordingLink: z
      .string()
      .trim()
      .max(500, 'At most 500 characters')
      .refine((v) => !v || /^https:\/\/\S+$/i.test(v), 'Enter a valid https:// link'),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'Must be on or after the start date', path: ['endDate'] })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { message: 'Must be after the start time', path: ['endTime'] })
  .refine((v) => !v.enrollmentDeadline || !v.endDate || v.enrollmentDeadline <= v.endDate, { message: 'Must be on or before the end date', path: ['enrollmentDeadline'] });
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS: Array<keyof FormValues> = ['name', 'courseId', 'trainerId', 'startDate', 'endDate', 'startTime', 'endTime', 'capacity', 'scheduleNote', 'meetLink', 'recordingLink', 'enrollmentDeadline', 'allowLateEnrollment', 'deliveryMode'];

const toValues = (b?: Batch): FormValues => ({
  name: b?.name ?? '',
  courseId: b?.courseId ?? '',
  trainerId: b?.trainerId ?? '',
  startDate: b?.startDate ?? '',
  endDate: b?.endDate ?? '',
  // API times are "HH:MM:SS"; <input type="time"> wants "HH:MM".
  startTime: b?.startTime?.slice(0, 5) ?? '',
  endTime: b?.endTime?.slice(0, 5) ?? '',
  capacity: b?.capacity ?? 20,
  scheduleNote: b?.scheduleNote ?? '',
  meetLink: b?.meetLink ?? '',
  recordingLink: b?.recordingLink ?? '',
  enrollmentDeadline: b?.enrollmentDeadline ?? '',
  allowLateEnrollment: b?.allowLateEnrollment ?? false,
  deliveryMode: b?.deliveryMode ?? '',
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
  // Active trainers, plus the batch's current one so editing never silently drops it.
  const assignable = (trainers.data ?? []).filter((t) => t.isActive || t.id === initial?.trainerId);
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
      await onSubmit({ ...values, name: values.name.trim(), scheduleNote: values.scheduleNote.trim(), meetLink: values.meetLink.trim(), recordingLink: values.recordingLink.trim(), enrollmentDeadline: values.enrollmentDeadline || null });
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
      description="Batches group enrolled students under a trainer and schedule. The batch code is generated automatically."
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
        <FormField
          label="Trainer"
          htmlFor="batch-trainer"
          error={errors.trainerId?.message}
          hint={trainers.data && assignable.length === 0 ? 'No active trainers yet. Add one under Trainers first.' : undefined}
          required
        >
          <Select id="batch-trainer" invalid={!!errors.trainerId} {...register('trainerId')}>
            <option value="">Select a trainer</option>
            {assignable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Batch start date" htmlFor="batch-start" error={errors.startDate?.message} required>
          <Input id="batch-start" type="date" invalid={!!errors.startDate} {...register('startDate')} />
        </FormField>
        <FormField label="End date" htmlFor="batch-end" error={errors.endDate?.message} required>
          <Input id="batch-end" type="date" invalid={!!errors.endDate} {...register('endDate')} />
        </FormField>
        <FormField label="Class start time" htmlFor="batch-start-time" error={errors.startTime?.message} required>
          <Input id="batch-start-time" type="time" invalid={!!errors.startTime} {...register('startTime')} />
        </FormField>
        <FormField label="Class end time" htmlFor="batch-end-time" error={errors.endTime?.message} hint="The trainer cannot be booked into another batch at an overlapping time." required>
          <Input id="batch-end-time" type="time" invalid={!!errors.endTime} {...register('endTime')} />
        </FormField>
        <FormField label="Capacity" htmlFor="batch-capacity" error={errors.capacity?.message} hint="Maximum number of seats" required>
          <Input id="batch-capacity" type="number" min={1} step={1} invalid={!!errors.capacity} {...register('capacity', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Enrollment deadline" htmlFor="batch-deadline" error={errors.enrollmentDeadline?.message} hint="Last day students can choose this batch. Blank = the start date.">
          <Input id="batch-deadline" type="date" invalid={!!errors.enrollmentDeadline} {...register('enrollmentDeadline')} />
        </FormField>
        <FormField label="Delivery mode" htmlFor="batch-mode" hint="Shown when students choose a batch">
          <Select id="batch-mode" {...register('deliveryMode')}>
            <option value="">Same as the course</option>
            <option value="live">Live</option>
            <option value="hybrid">Hybrid</option>
            <option value="recorded">Recorded</option>
          </Select>
        </FormField>
        <div className="sm:col-span-2">
          <Checkbox id="batch-late" label="Allow late enrollment" description="Keep accepting students after the deadline or once the batch has started (a full batch stays closed)." {...register('allowLateEnrollment')} />
        </div>
        <FormField label="Schedule note" htmlFor="batch-note" error={errors.scheduleNote?.message} hint="Shown to students, e.g. Sat & Sun, 10:00–13:00" className="sm:col-span-2">
          <Textarea id="batch-note" rows={2} invalid={!!errors.scheduleNote} {...register('scheduleNote')} />
        </FormField>
        <FormField
          label="Google Meet link"
          htmlFor="batch-meet"
          error={errors.meetLink?.message}
          hint="Private: shown only to paid or enrolled students of this batch, never on public pages."
          className="sm:col-span-2"
        >
          <Input id="batch-meet" type="url" placeholder="https://meet.google.com/abc-defg-hij" invalid={!!errors.meetLink} {...register('meetLink')} />
        </FormField>
        <FormField label="Recorded session link" htmlFor="batch-recording" error={errors.recordingLink?.message} hint="Private, like the Meet link. Can be added after the class." className="sm:col-span-2">
          <Input id="batch-recording" type="url" placeholder="https://drive.google.com/..." invalid={!!errors.recordingLink} {...register('recordingLink')} />
        </FormField>
      </form>
    </Dialog>
  );
};
