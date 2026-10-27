import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useAdminCourse, useAdminCourseCategories, useAdminTrainers, useCourseMutations } from '@/hooks/useAdmin';
import type { CurriculumModuleInput } from '@/services';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { cn, formatDuration } from '@/lib/utils';
import { formatAmount, paymentOptionSummary, sortedPaymentOptions } from '@/lib/coursePricing';
import type { Course, CourseUpsertRequest, DurationUnit, LessonType } from '@/types';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Checkbox, EmptyState, ErrorState, FormField, ImageWithFallback, InlineAlert, Input, LoadingSkeleton, PageHeader, Select, StatusBadge, Textarea, useToast } from '@/components/ui';

// ---------------------------------------------------------------------------
// Course details form
// ---------------------------------------------------------------------------

const numberField = (msg: string) => z.number({ invalid_type_error: msg });
const amountText = z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, 'Enter a valid amount or leave blank');
// Same day counts as the backend (apps/courses/pricing.py): 1 week = 7 days, 1 month = 30 days.
const DAYS_PER: Record<DurationUnit, number> = { days: 1, weeks: 7, months: 30 };
const DAILY_MAX_DAYS = 30;
const base = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(120, 'At most 120 characters'),
  shortDescription: z.string().trim().min(10, 'At least 10 characters').max(200, 'At most 200 characters'),
  description: z.string().trim().min(20, 'At least 20 characters').max(4000, 'At most 4000 characters'),
  thumbnailUrl: z.string().trim().url('Enter a valid image URL').or(z.literal('')),
  trainerId: z.string(),
  durationValue: numberField('Enter the duration').int('Whole numbers only').min(1, 'At least 1').max(3650, 'Too long'),
  durationUnit: z.enum(['days', 'weeks', 'months']),
  categoryId: z.string(),
  totalHours: numberField('Enter the total hours').min(1, 'At least 1 hour'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.enum(['live', 'recorded', 'hybrid']),
  price: numberField('Enter a price').min(0, 'Cannot be negative'),
  discountType: z.enum(['', 'percentage', 'fixed']),
  discountValue: amountText,
  discountStartsAt: z.string(),
  discountEndsAt: z.string(),
  promotionalPrice: amountText,
  allowFullPayment: z.boolean(),
  allowDailyInstallments: z.boolean(),
  allowMonthlyInstallments: z.boolean(),
  customEnabled: z.boolean(),
  customDeposit: amountText,
  customCount: z.string().trim().regex(/^([1-9]\d?)?$/, 'Enter 1–60'),
  customFrequency: z.enum(['days', 'weeks', 'months']),
  customInterval: numberField('Enter the interval').int('Whole numbers only').min(1, 'At least 1').max(12, 'At most 12'),
  customFee: amountText,
  status: z.enum(['draft', 'published', 'unpublished', 'archived']),
  featured: z.boolean(),
  certificateEnabled: z.boolean(),
  certificateIssuance: z.enum(['automatic', 'manual_approval']),
  requireAllRequiredLessons: z.boolean(),
  minLiveAttendancePercent: z.string().trim().regex(/^(100|[1-9]?\d)?$/, 'Enter 0–100 or leave blank'),
  requireAssessment: z.boolean(),
  prerequisites: z.string(),
  outcomes: z.string(),
  scheduleSummary: z.string().trim().max(240, 'At most 240 characters'),
});
const schema = base.superRefine((v, ctx) => {
  const issue = (path: keyof typeof v, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const days = (v.durationValue || 0) * DAYS_PER[v.durationUnit];
  const dv = Number(v.discountValue);
  if (v.discountType && v.price <= 0) issue('discountValue', 'A free course cannot have a discount');
  else if (v.discountType && (v.discountValue === '' || dv <= 0)) issue('discountValue', 'Enter a discount greater than zero');
  else if (v.discountType === 'percentage' && dv > 100) issue('discountValue', 'Cannot exceed 100%');
  else if (v.discountType === 'fixed' && dv > v.price) issue('discountValue', 'Cannot exceed the original price');
  if (v.promotionalPrice !== '' && Number(v.promotionalPrice) >= v.price) issue('promotionalPrice', 'Must be lower than the original price');
  if (v.discountStartsAt && v.discountEndsAt && v.discountEndsAt <= v.discountStartsAt) issue('discountEndsAt', 'Must be after the start');
  if (v.allowDailyInstallments && (days < 2 || days > DAILY_MAX_DAYS)) issue('allowDailyInstallments', `Only for courses of 2–${DAILY_MAX_DAYS} days`);
  if (v.allowMonthlyInstallments && days <= DAILY_MAX_DAYS) issue('allowMonthlyInstallments', 'Only for courses longer than one month');
  if (v.customEnabled && v.customCount === '') issue('customCount', 'Enter the number of installments');
  if (v.customEnabled && Number(v.customDeposit || 0) >= v.price + Number(v.customFee || 0)) issue('customDeposit', 'Must be lower than the total fee');
  if (v.customEnabled && !Number(v.customDeposit || 0) && Number(v.customCount) === 1) issue('customCount', 'Use at least 2, or add a deposit');
  if (!v.allowFullPayment && !v.allowDailyInstallments && !v.allowMonthlyInstallments && !v.customEnabled) issue('allowFullPayment', 'Enable at least one payment option');
});
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS = Object.keys(base.shape);

const EMPTY: FormValues = {
  title: '',
  shortDescription: '',
  description: '',
  thumbnailUrl: '',
  trainerId: '',
  categoryId: '',
  durationValue: 1,
  durationUnit: 'months',
  totalHours: 20,
  level: 'beginner',
  format: 'recorded',
  price: 0,
  discountType: '',
  discountValue: '',
  discountStartsAt: '',
  discountEndsAt: '',
  promotionalPrice: '',
  allowFullPayment: true,
  allowDailyInstallments: false,
  allowMonthlyInstallments: false,
  customEnabled: false,
  customDeposit: '',
  customCount: '',
  customFrequency: 'months',
  customInterval: 1,
  customFee: '',
  status: 'draft',
  featured: false,
  certificateEnabled: true,
  certificateIssuance: 'automatic',
  requireAllRequiredLessons: true,
  minLiveAttendancePercent: '',
  requireAssessment: false,
  prerequisites: '',
  outcomes: '',
  scheduleSummary: '',
};

const toForm = (c: Course): FormValues => ({
  title: c.title,
  shortDescription: c.shortDescription,
  description: c.description,
  thumbnailUrl: c.thumbnailUrl,
  trainerId: c.trainer?.id ?? '',
  categoryId: c.category?.id ?? '',
  durationValue: c.durationValue ?? c.durationWeeks,
  durationUnit: c.durationUnit ?? 'weeks',
  totalHours: c.totalHours,
  level: c.level,
  format: c.format,
  price: c.price,
  discountType: c.discountType ?? '',
  discountValue: c.discountValue == null ? '' : String(c.discountValue),
  discountStartsAt: toLocalInput(c.discountStartsAt),
  discountEndsAt: toLocalInput(c.discountEndsAt),
  promotionalPrice: c.promotionalPrice == null ? '' : String(c.promotionalPrice),
  allowFullPayment: c.allowFullPayment ?? true,
  allowDailyInstallments: c.allowDailyInstallments ?? false,
  allowMonthlyInstallments: c.allowMonthlyInstallments ?? false,
  customEnabled: c.customPlan?.enabled ?? false,
  customDeposit: c.customPlan?.depositAmount ? String(c.customPlan.depositAmount) : '',
  customCount: c.customPlan?.installmentCount ? String(c.customPlan.installmentCount) : '',
  customFrequency: c.customPlan?.frequency ?? 'months',
  customInterval: c.customPlan?.interval ?? 1,
  customFee: c.customPlan?.additionalFee ? String(c.customPlan.additionalFee) : '',
  status: c.status,
  featured: c.featured,
  certificateEnabled: c.certificateEnabled,
  certificateIssuance: c.certificateIssuance,
  requireAllRequiredLessons: c.completionCriteria.requireAllRequiredLessons,
  minLiveAttendancePercent: c.completionCriteria.minLiveAttendancePercent === null ? '' : String(c.completionCriteria.minLiveAttendancePercent),
  requireAssessment: c.completionCriteria.requireAssessment,
  prerequisites: c.prerequisites.join('\n'),
  outcomes: c.outcomes.join('\n'),
  scheduleSummary: c.scheduleSummary,
});

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const pad = (n: number) => String(n).padStart(2, '0');
/** ISO datetime -> value for <input type="datetime-local"> in the admin's local time. */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const amountOrNull = (v: string) => (v === '' ? null : Number(v));

const toPayload = (v: FormValues): CourseUpsertRequest => ({
  title: v.title,
  shortDescription: v.shortDescription,
  description: v.description,
  thumbnailUrl: v.thumbnailUrl,
  trainerId: v.trainerId || null,
  categoryId: v.categoryId || null,
  // Kept for older readers; the backend derives it from durationValue/durationUnit.
  durationWeeks: Math.max(1, Math.ceil((v.durationValue * DAYS_PER[v.durationUnit]) / 7)),
  durationValue: v.durationValue,
  durationUnit: v.durationUnit,
  totalHours: v.totalHours,
  level: v.level,
  format: v.format,
  price: v.price,
  discountPrice: null,
  discountType: v.discountType,
  discountValue: v.discountType ? amountOrNull(v.discountValue) : null,
  discountStartsAt: fromLocalInput(v.discountStartsAt),
  discountEndsAt: fromLocalInput(v.discountEndsAt),
  promotionalPrice: amountOrNull(v.promotionalPrice),
  allowFullPayment: v.allowFullPayment,
  allowDailyInstallments: v.allowDailyInstallments,
  allowMonthlyInstallments: v.allowMonthlyInstallments,
  customPlan: {
    enabled: v.customEnabled,
    depositAmount: Number(v.customDeposit || 0),
    installmentCount: v.customCount === '' ? null : Number(v.customCount),
    frequency: v.customFrequency,
    interval: v.customInterval,
    additionalFee: Number(v.customFee || 0),
  },
  status: v.status,
  featured: v.featured,
  certificateEnabled: v.certificateEnabled,
  certificateIssuance: v.certificateIssuance,
  completionCriteria: {
    requireAllRequiredLessons: v.requireAllRequiredLessons,
    minLiveAttendancePercent: v.minLiveAttendancePercent === '' ? null : Number(v.minLiveAttendancePercent),
    requireAssessment: v.requireAssessment,
  },
  prerequisites: lines(v.prerequisites),
  outcomes: lines(v.outcomes),
  scheduleSummary: v.scheduleSummary,
});

const CourseDetailsForm = ({ course }: { course?: Course }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const trainers = useAdminTrainers();
  const categories = useAdminCourseCategories();
  const { create, update } = useCourseMutations();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: course ? toForm(course) : EMPTY });

  // Sync from the server only when a newer version arrives and the admin has no unsaved edits.
  // Comparing updatedAt (not object identity) prevents a stale pre-save course from overwriting a just-saved form.
  const syncedAt = useRef(course?.updatedAt ?? '');
  useEffect(() => {
    if (course && !isDirty && course.updatedAt > syncedAt.current) {
      syncedAt.current = course.updatedAt;
      reset(toForm(course));
    }
  }, [course, isDirty, reset]);

  const thumb = watch('thumbnailUrl');
  const certificateEnabled = watch('certificateEnabled');
  const [price, discountType, discountValue, promotionalPrice, durationValue, durationUnit, customEnabled] = watch(['price', 'discountType', 'discountValue', 'promotionalPrice', 'durationValue', 'durationUnit', 'customEnabled']);
  const durationDays = (durationValue || 0) * DAYS_PER[durationUnit];
  // Preview only (ignores the offer window); the backend recalculates and is what students are charged.
  const listPrice = Number.isFinite(price) ? price : 0;
  const discountEstimate = discountType === 'percentage' ? (listPrice * Number(discountValue || 0)) / 100 : discountType === 'fixed' ? Number(discountValue || 0) : 0;
  const finalEstimate = promotionalPrice !== '' ? Number(promotionalPrice) : Math.max(0, listPrice - Math.min(discountEstimate, listPrice));

  // New courses: monthly installments are on by default for courses longer than a month, until the admin decides.
  const monthlyTouched = !!dirtyFields.allowMonthlyInstallments;
  useEffect(() => {
    if (!course && !monthlyTouched) setValue('allowMonthlyInstallments', durationDays > DAILY_MAX_DAYS);
  }, [course, monthlyTouched, durationDays, setValue]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = toPayload(values);
    try {
      if (course) {
        const updated = await update.mutateAsync({ id: course.id, payload });
        syncedAt.current = updated.updatedAt;
        reset(toForm(updated));
        toast.success('Course saved', `"${updated.title}" has been updated.`);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success('Course created', 'Now add modules and lessons to build the curriculum.');
        navigate(`/admin/courses/${created.id}`, { replace: true });
      }
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if (FIELD_KEYS.includes(field)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
      toast.error('Could not save course', getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader title="Course details" description="Public information, pricing and completion rules." action={course ? <StatusBadge status={course.status} /> : null} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardBody className="space-y-8">
          {serverError ? <InlineAlert tone="danger">{serverError}</InlineAlert> : null}

          <section className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Title" htmlFor="title" error={errors.title?.message} required className="sm:col-span-2">
                <Input id="title" invalid={!!errors.title} {...register('title')} />
              </FormField>
              <FormField label="Short description" htmlFor="shortDescription" error={errors.shortDescription?.message} hint="Shown on course cards (10–200 characters)" required className="sm:col-span-2">
                <Textarea id="shortDescription" rows={2} invalid={!!errors.shortDescription} {...register('shortDescription')} />
              </FormField>
              <FormField label="Full description" htmlFor="description" error={errors.description?.message} required className="sm:col-span-2">
                <Textarea id="description" rows={6} invalid={!!errors.description} {...register('description')} />
              </FormField>
              <FormField label="Thumbnail URL" htmlFor="thumbnailUrl" error={errors.thumbnailUrl?.message} hint="Landscape image, 16:10 recommended" className="sm:col-span-2">
                <Input id="thumbnailUrl" type="url" placeholder="https://…" invalid={!!errors.thumbnailUrl} {...register('thumbnailUrl')} />
              </FormField>
            </div>
            <div>
              <p className="mb-1.5 block text-sm font-medium text-charcoal-800">Thumbnail preview</p>
              <ImageWithFallback key={thumb} src={thumb || undefined} alt="Course thumbnail preview" className="aspect-[16/10] w-full rounded-2xl border border-ivory-300 object-cover" fallbackLabel="No image" />
            </div>
          </section>

          <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Delivery & pricing</h4>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Trainer" htmlFor="trainerId" error={errors.trainerId?.message} hint="Optional. You can assign a trainer later." className="sm:col-span-2">
                <Select id="trainerId" invalid={!!errors.trainerId} {...register('trainerId')}>
                  <option value="">No trainer yet</option>
                  {trainers.data?.filter((t) => t.isActive || t.id === course?.trainer?.id).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title ? `${t.name} — ${t.title}` : t.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Level" htmlFor="level" error={errors.level?.message} required>
                <Select id="level" {...register('level')}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </FormField>
              <FormField label="Format" htmlFor="format" error={errors.format?.message} required>
                <Select id="format" {...register('format')}>
                  <option value="recorded">Recorded</option>
                  <option value="live">Live</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
              </FormField>
              <FormField label="Duration" htmlFor="durationValue" error={errors.durationValue?.message} required>
                <div className="flex gap-2">
                  <Input id="durationValue" type="number" min={1} step={1} invalid={!!errors.durationValue} {...register('durationValue', { valueAsNumber: true })} />
                  <Select aria-label="Duration unit" className="w-32" {...register('durationUnit')}>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </Select>
                </div>
              </FormField>
              <FormField label="Category" htmlFor="categoryId" error={errors.categoryId?.message} hint={<>Blank places it by duration. <Link to="/admin/course-categories" className="font-semibold text-rose-700 hover:underline">Manage</Link></>}>
                <Select id="categoryId" {...register('categoryId')}>
                  <option value="">Automatic (by duration)</option>
                  {categories.data?.filter((cat) => cat.isActive || cat.id === course?.category?.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Total hours" htmlFor="totalHours" error={errors.totalHours?.message} required>
                <Input id="totalHours" type="number" min={1} step={0.5} invalid={!!errors.totalHours} {...register('totalHours', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Status" htmlFor="status" error={errors.status?.message} hint="Publishing from here also requires at least one lesson" required>
                <Select id="status" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormField>
              <FormField label="Schedule summary" htmlFor="scheduleSummary" error={errors.scheduleSummary?.message} hint="e.g. Weekends, 10:00–13:00 IST" className="sm:col-span-2 lg:col-span-3">
                <Input id="scheduleSummary" invalid={!!errors.scheduleSummary} {...register('scheduleSummary')} />
              </FormField>
              <div className="sm:col-span-2 lg:col-span-4">
                <Checkbox id="featured" label="Featured course" description="Highlight on the home page and at the top of the catalogue" {...register('featured')} />
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Price & discount</h4>
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Original price (INR)" htmlFor="price" error={errors.price?.message} required>
                  <Input id="price" type="number" min={0} step={1} invalid={!!errors.price} {...register('price', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Discount type" htmlFor="discountType" error={errors.discountType?.message}>
                  <Select id="discountType" {...register('discountType')}>
                    <option value="">No discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (INR)</option>
                  </Select>
                </FormField>
                <FormField label={discountType === 'percentage' ? 'Discount (%)' : 'Discount (INR)'} htmlFor="discountValue" error={errors.discountValue?.message}>
                  <Input id="discountValue" inputMode="decimal" placeholder="—" disabled={!discountType} invalid={!!errors.discountValue} {...register('discountValue')} />
                </FormField>
                <FormField label="Offer starts" htmlFor="discountStartsAt" error={errors.discountStartsAt?.message} hint="Optional; blank = immediately">
                  <Input id="discountStartsAt" type="datetime-local" {...register('discountStartsAt')} />
                </FormField>
                <FormField label="Offer expires" htmlFor="discountEndsAt" error={errors.discountEndsAt?.message} hint="Optional; the discount stops automatically">
                  <Input id="discountEndsAt" type="datetime-local" invalid={!!errors.discountEndsAt} {...register('discountEndsAt')} />
                </FormField>
                <FormField label="Promotional price (INR)" htmlFor="promotionalPrice" error={errors.promotionalPrice?.message} hint="Optional; overrides the discount during the offer window">
                  <Input id="promotionalPrice" inputMode="decimal" placeholder="—" invalid={!!errors.promotionalPrice} {...register('promotionalPrice')} />
                </FormField>
              </div>
              <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">Estimate</p>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between"><dt className="text-charcoal-500">Original</dt><dd>{formatAmount(listPrice)}</dd></div>
                  <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>− {formatAmount(Math.max(0, listPrice - finalEstimate))}</dd></div>
                  <div className="flex justify-between border-t border-ivory-300 pt-1 font-semibold"><dt>Final fee</dt><dd>{formatAmount(finalEstimate)}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-charcoal-500">The server recalculates on save; students are charged the server amount.</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Payment options</h4>
            <p className="mb-4 text-xs text-charcoal-500">Installments are separate payments the student makes; nothing is charged automatically.</p>
            {errors.allowFullPayment?.message ? <InlineAlert tone="danger" className="mb-3">{errors.allowFullPayment.message}</InlineAlert> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <Checkbox id="allowFullPayment" label="Full payment" description="Pay the entire (discounted) fee upfront" {...register('allowFullPayment')} />
              <div>
                <Checkbox id="allowMonthlyInstallments" label="Monthly installments" description={durationDays > DAILY_MAX_DAYS ? `${Math.ceil(durationDays / 30)} monthly payments` : 'Only for courses longer than one month'} disabled={durationDays <= DAILY_MAX_DAYS} {...register('allowMonthlyInstallments')} />
                {errors.allowMonthlyInstallments?.message ? <p className="mt-1 text-xs text-red-600">{errors.allowMonthlyInstallments.message}</p> : null}
              </div>
              <div>
                <Checkbox id="allowDailyInstallments" label="Daily installments" description={durationDays <= DAILY_MAX_DAYS && durationDays >= 2 ? `${durationDays} daily payments` : `Only for courses of 2–${DAILY_MAX_DAYS} days`} disabled={durationDays > DAILY_MAX_DAYS || durationDays < 2} {...register('allowDailyInstallments')} />
                {errors.allowDailyInstallments?.message ? <p className="mt-1 text-xs text-red-600">{errors.allowDailyInstallments.message}</p> : null}
              </div>
              <Checkbox id="customEnabled" label="Custom installment plan" description="Deposit, frequency, count and fees of your choice" {...register('customEnabled')} />
            </div>
            {customEnabled ? (
              <div className="mt-5 grid gap-5 rounded-2xl border border-ivory-300 bg-ivory-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <FormField label="Initial deposit (INR)" htmlFor="customDeposit" error={errors.customDeposit?.message} hint="Optional">
                  <Input id="customDeposit" inputMode="decimal" placeholder="0" invalid={!!errors.customDeposit} {...register('customDeposit')} />
                </FormField>
                <FormField label="Installments" htmlFor="customCount" error={errors.customCount?.message} required>
                  <Input id="customCount" inputMode="numeric" placeholder="e.g. 3" invalid={!!errors.customCount} {...register('customCount')} />
                </FormField>
                <FormField label="Every" htmlFor="customInterval" error={errors.customInterval?.message}>
                  <Input id="customInterval" type="number" min={1} max={12} invalid={!!errors.customInterval} {...register('customInterval', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Frequency" htmlFor="customFrequency">
                  <Select id="customFrequency" {...register('customFrequency')}>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </Select>
                </FormField>
                <FormField label="Additional fee (INR)" htmlFor="customFee" error={errors.customFee?.message} hint="Added to the plan total">
                  <Input id="customFee" inputMode="decimal" placeholder="0" invalid={!!errors.customFee} {...register('customFee')} />
                </FormField>
                <p className="text-xs text-charcoal-500 sm:col-span-2 lg:col-span-5">The remaining fee (plus any additional fee) is split evenly across the installments; due dates follow the frequency from the day the student pays the first one.</p>
              </div>
            ) : null}
            {course && course.pricing.paymentOptions.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Offered to students now (saved, from server)</p>
                <ul className="mt-2 space-y-1">
                  {sortedPaymentOptions(course.pricing.paymentOptions).map((o) => (
                    <li key={o.type} className="flex flex-wrap justify-between gap-x-3">
                      <span className="font-medium">{o.label}</span>
                      <span className="text-charcoal-700">{paymentOptionSummary(o, course.currency)} · total {formatAmount(o.totalAmount, course.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Certificate & completion criteria</h4>
            <div className="grid gap-5 sm:grid-cols-2">
              <Checkbox id="certificateEnabled" label="Issue certificates for this course" description="Students who meet the criteria below become eligible" {...register('certificateEnabled')} />
              <FormField label="Issuance mode" htmlFor="certificateIssuance" error={errors.certificateIssuance?.message}>
                <Select id="certificateIssuance" disabled={!certificateEnabled} {...register('certificateIssuance')}>
                  <option value="automatic">Automatic on completion</option>
                  <option value="manual_approval">Manual approval by admin</option>
                </Select>
              </FormField>
              <Checkbox id="requireAllRequiredLessons" label="Require all required lessons" description="Every lesson marked as required must be completed" {...register('requireAllRequiredLessons')} />
              <Checkbox id="requireAssessment" label="Require a passed assessment" description="Course must include an assessment lesson" {...register('requireAssessment')} />
              <FormField label="Minimum live attendance (%)" htmlFor="minLiveAttendancePercent" error={errors.minLiveAttendancePercent?.message} hint="Leave blank if attendance is not required">
                <Input id="minLiveAttendancePercent" inputMode="numeric" placeholder="e.g. 75" invalid={!!errors.minLiveAttendancePercent} {...register('minLiveAttendancePercent')} />
              </FormField>
            </div>
          </section>

          <section>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Prerequisites & outcomes</h4>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Prerequisites" htmlFor="prerequisites" hint="One per line" error={errors.prerequisites?.message}>
                <Textarea id="prerequisites" rows={5} placeholder={'Basic skincare knowledge\nOwn makeup kit'} {...register('prerequisites')} />
              </FormField>
              <FormField label="Learning outcomes" htmlFor="outcomes" hint="One per line" error={errors.outcomes?.message}>
                <Textarea id="outcomes" rows={5} placeholder={'Create a full bridal look\nColour-match foundation confidently'} {...register('outcomes')} />
              </FormField>
            </div>
          </section>
        </CardBody>
        <CardFooter>
          {course && isDirty ? <span className="mr-auto text-xs text-charcoal-500">You have unsaved changes</span> : null}
          <Button type="submit" loading={isSubmitting} leftIcon={<Save className="h-4 w-4" />}>
            {course ? 'Save details' : 'Create course'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Curriculum editor: Course → Weeks → Days → Lessons
// ---------------------------------------------------------------------------

interface LessonDraft {
  key: string;
  id?: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isRequired: boolean;
  isPreview: boolean;
  isPublished: boolean;
  summary: string;
  videoUrl: string;
}
interface DayDraft {
  key: string;
  id?: string;
  title: string;
  description: string;
  isPublished: boolean;
  lessons: LessonDraft[];
}
/** A week (CourseModule). `lessons` are lessons without a day (from before days existed). */
interface WeekDraft {
  key: string;
  id?: string;
  title: string;
  description: string;
  isPublished: boolean;
  lessons: LessonDraft[];
  days: DayDraft[];
}

let keySeq = 0;
const nextKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;
const LESSON_TYPES: LessonType[] = ['video', 'reading', 'live', 'assessment'];
const isVideoUrlValid = (v: string) => !v.trim() || /^https:\/\/\S+$/i.test(v.trim());

const lessonDraft = (l: Course['modules'][number]['lessons'][number]): LessonDraft => ({
  key: l.id,
  id: l.id,
  title: l.title,
  type: l.type,
  durationMinutes: l.durationMinutes,
  isRequired: l.isRequired,
  isPreview: l.isPreview ?? false,
  isPublished: l.isPublished ?? true,
  summary: l.summary,
  videoUrl: l.videoUrl ?? '',
});
const newLesson = (): LessonDraft => ({ key: nextKey(), title: '', type: 'video', durationMinutes: 15, isRequired: true, isPreview: false, isPublished: true, summary: '', videoUrl: '' });
const newDay = (title: string): DayDraft => ({ key: nextKey(), title, description: '', isPublished: true, lessons: [] });

const fromCourse = (course: Course): WeekDraft[] =>
  [...course.modules]
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const days = [...(m.days ?? [])].sort((a, b) => a.order - b.order);
      const inDay = new Set(days.flatMap((d) => d.lessons.map((l) => l.id)));
      return {
        key: m.id,
        id: m.id,
        title: m.title,
        description: m.description,
        isPublished: m.isPublished ?? true,
        lessons: [...m.lessons].filter((l) => !inDay.has(l.id)).sort((a, b) => a.order - b.order).map(lessonDraft),
        days: days.map((d) => ({ key: d.id, id: d.id, title: d.title, description: d.description, isPublished: d.isPublished, lessons: [...d.lessons].sort((a, b) => a.order - b.order).map(lessonDraft) })),
      };
    });

/** Empty skeleton from the course duration: Week N with Day 1..7 each (days numbered across the course). */
const skeletonFromDuration = (durationDays: number): WeekDraft[] => {
  const total = Math.max(1, Math.min(durationDays || 7, 7 * 52));
  const weeks: WeekDraft[] = [];
  for (let d = 1, w = 1; d <= total; w++) {
    const days: DayDraft[] = [];
    for (let i = 0; i < 7 && d <= total; i++, d++) days.push(newDay(`Day ${d}`));
    weeks.push({ key: nextKey(), title: `Week ${w}`, description: '', isPublished: true, lessons: [], days });
  }
  return weeks;
};

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const toLessonInput = (l: LessonDraft) => ({
  id: l.id,
  title: l.title.trim(),
  type: l.type,
  durationMinutes: Math.max(1, Math.round(l.durationMinutes || 1)),
  isRequired: l.isRequired,
  isPreview: l.isPreview,
  isPublished: l.isPublished,
  summary: l.summary.trim(),
  videoUrl: l.videoUrl.trim(),
});

const MoveButtons = ({ label, index, count, onMove }: { label: string; index: number; count: number; onMove: (to: number) => void }) => (
  <>
    <Button variant="ghost" size="icon" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}>
      <ArrowUp className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
      <ArrowDown className="h-4 w-4" />
    </Button>
  </>
);

const CurriculumEditor = ({ course }: { course: Course }) => {
  const toast = useToast();
  const { curriculum } = useCourseMutations();
  const [weeks, setWeeks] = useState<WeekDraft[]>(() => fromCourse(course));
  const [dirty, setDirty] = useState(false);

  // Same rule as the details form: only adopt a strictly newer server version, and never over unsaved edits.
  const syncedAt = useRef(course.updatedAt);
  useEffect(() => {
    if (!dirty && course.updatedAt > syncedAt.current) {
      syncedAt.current = course.updatedAt;
      setWeeks(fromCourse(course));
    }
  }, [course, dirty]);

  const edit = (fn: (w: WeekDraft[]) => WeekDraft[]) => {
    setWeeks(fn);
    setDirty(true);
  };
  const updateWeek = (wi: number, patch: Partial<WeekDraft> | ((w: WeekDraft) => Partial<WeekDraft>)) =>
    edit((ws) => ws.map((w, i) => (i === wi ? { ...w, ...(typeof patch === 'function' ? patch(w) : patch) } : w)));
  const updateDay = (wi: number, di: number, patch: Partial<DayDraft> | ((d: DayDraft) => Partial<DayDraft>)) =>
    updateWeek(wi, (w) => ({ days: w.days.map((d, j) => (j === di ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)) }));
  /** di === null addresses the week's lessons without a day. */
  const updateLessons = (wi: number, di: number | null, fn: (ls: LessonDraft[]) => LessonDraft[]) =>
    di === null ? updateWeek(wi, (w) => ({ lessons: fn(w.lessons) })) : updateDay(wi, di, (d) => ({ lessons: fn(d.lessons) }));
  const updateLesson = (wi: number, di: number | null, li: number, patch: Partial<LessonDraft>) => updateLessons(wi, di, (ls) => ls.map((l, k) => (k === li ? { ...l, ...patch } : l)));
  const moveLessonToDay = (wi: number, from: number | null, li: number, to: number | null) =>
    updateWeek(wi, (w) => {
      const source = from === null ? w.lessons : w.days[from].lessons;
      const lesson = source[li];
      const strip = (ls: LessonDraft[]) => ls.filter((l) => l.key !== lesson.key);
      const lessons = from === null ? strip(w.lessons) : w.lessons;
      const days = w.days.map((d, j) => ({ ...d, lessons: j === from ? strip(d.lessons) : d.lessons }));
      if (to === null) return { lessons: [...lessons, lesson], days };
      return { lessons, days: days.map((d, j) => (j === to ? { ...d, lessons: [...d.lessons, lesson] } : d)) };
    });

  const allLessons = weeks.flatMap((w) => [...w.lessons, ...w.days.flatMap((d) => d.lessons)]);
  const dayCount = weeks.reduce((n, w) => n + w.days.length, 0);
  const totalMinutes = allLessons.reduce((s, l) => s + (l.durationMinutes || 0), 0);
  const invalid =
    weeks.some((w) => w.title.trim().length < 2 || w.days.some((d) => d.title.trim().length < 2)) ||
    allLessons.some((l) => l.title.trim().length < 2 || !isVideoUrlValid(l.videoUrl));

  const save = async () => {
    const payload: CurriculumModuleInput[] = weeks.map((w) => ({
      id: w.id,
      title: w.title.trim(),
      description: w.description.trim(),
      isPublished: w.isPublished,
      lessons: w.lessons.map(toLessonInput),
      days: w.days.map((d) => ({ id: d.id, title: d.title.trim(), description: d.description.trim(), isPublished: d.isPublished, lessons: d.lessons.map(toLessonInput) })),
    }));
    try {
      const updated = await curriculum.mutateAsync({ id: course.id, modules: payload });
      syncedAt.current = updated.updatedAt;
      setWeeks(fromCourse(updated));
      setDirty(false);
      toast.success('Curriculum saved', `${updated.modules.length} week${updated.modules.length === 1 ? '' : 's'} saved.`);
    } catch (e) {
      toast.error('Could not save curriculum', getErrorMessage(e));
    }
  };

  // Days are numbered across the whole course, like the student view.
  let dayNumber = 0;

  const lessonRows = (wi: number, di: number | null, lessons: LessonDraft[], days: DayDraft[]) => (
    <ul className="divide-y divide-ivory-200">
      {lessons.map((l, li) => (
        <li key={l.key} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <FormField label="Lesson title" htmlFor={`${l.key}-title`} required className="lg:col-span-4" error={l.title.trim().length > 0 && l.title.trim().length < 2 ? 'At least 2 characters' : undefined}>
            <Input id={`${l.key}-title`} value={l.title} onChange={(e) => updateLesson(wi, di, li, { title: e.target.value })} />
          </FormField>
          <FormField label="Type" htmlFor={`${l.key}-type`} className="lg:col-span-2">
            <Select id={`${l.key}-type`} value={l.type} onChange={(e) => updateLesson(wi, di, li, { type: e.target.value as LessonType })}>
              {LESSON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Minutes" htmlFor={`${l.key}-dur`} className="lg:col-span-2">
            <Input id={`${l.key}-dur`} type="number" min={1} value={l.durationMinutes} onChange={(e) => updateLesson(wi, di, li, { durationMinutes: Number(e.target.value) })} />
          </FormField>
          <FormField label="Day" htmlFor={`${l.key}-day`} className="lg:col-span-4">
            <Select id={`${l.key}-day`} value={di === null ? '' : String(di)} onChange={(e) => moveLessonToDay(wi, di, li, e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">No day (directly in the week)</option>
              {days.map((d, j) => (
                <option key={d.key} value={j}>
                  {d.title || `Day ${j + 1}`}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description" htmlFor={`${l.key}-sum`} className="sm:col-span-2 lg:col-span-12">
            <Input id={`${l.key}-sum`} value={l.summary} onChange={(e) => updateLesson(wi, di, li, { summary: e.target.value })} placeholder="Optional, shown in the syllabus" />
          </FormField>
          {l.type === 'video' || l.videoUrl ? (
            <FormField
              label="Google Drive video link"
              htmlFor={`${l.key}-video`}
              className="sm:col-span-2 lg:col-span-12"
              error={isVideoUrlValid(l.videoUrl) ? undefined : 'Enter a valid https:// link'}
              hint={l.isPreview ? 'Free preview: this link is visible to everyone on the course page.' : 'In Google Drive: Share → General access → "Anyone with the link" (Viewer). Only enrolled students see this link.'}
            >
              <Input id={`${l.key}-video`} type="url" value={l.videoUrl} onChange={(e) => updateLesson(wi, di, li, { videoUrl: e.target.value })} placeholder="https://drive.google.com/file/d/…/view" />
            </FormField>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-12">
            <div className="flex flex-wrap gap-x-5">
              <Checkbox id={`${l.key}-req`} label="Required for completion" checked={l.isRequired} onChange={(e) => updateLesson(wi, di, li, { isRequired: e.target.checked })} className="py-2" />
              <Checkbox id={`${l.key}-prev`} label="Free preview" checked={l.isPreview} onChange={(e) => updateLesson(wi, di, li, { isPreview: e.target.checked })} className="py-2" />
              <Checkbox id={`${l.key}-pub`} label="Published" checked={l.isPublished} onChange={(e) => updateLesson(wi, di, li, { isPublished: e.target.checked })} className="py-2" />
            </div>
            <div className="flex items-center gap-1">
              {l.type === 'live' ? <Badge tone="rose">Matches a live session by title</Badge> : null}
              <MoveButtons label="lesson" index={li} count={lessons.length} onMove={(to) => updateLessons(wi, di, (ls) => move(ls, li, to))} />
              <Button variant="ghost" size="icon" aria-label="Remove lesson" className="text-red-600 hover:bg-red-50" onClick={() => updateLessons(wi, di, (ls) => ls.filter((_, k) => k !== li))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader
        title="Curriculum"
        description={`${weeks.length} week${weeks.length === 1 ? '' : 's'} · ${dayCount} day${dayCount === 1 ? '' : 's'} · ${allLessons.length} lesson${allLessons.length === 1 ? '' : 's'} · ${formatDuration(totalMinutes)}`}
        action={
          <Button variant="secondary" size="sm" onClick={() => edit((ws) => [...ws, { key: nextKey(), title: `Week ${ws.length + 1}`, description: '', isPublished: true, lessons: [], days: [] }])} leftIcon={<Plus className="h-4 w-4" />}>
            Add week
          </Button>
        }
      />
      <CardBody className="space-y-5">
        {weeks.length === 0 ? (
          <EmptyState
            title="No weeks yet"
            description="Organise the syllabus as Weeks → Days → Lessons. Generate the weeks and days from the course duration, or add them one by one. A course needs at least one lesson before it can be published."
            compact
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => edit(() => skeletonFromDuration(course.durationDays))}>Generate {Math.ceil((course.durationDays || 7) / 7)} week(s) from duration</Button>
                <Button variant="outline" onClick={() => edit(() => [{ key: nextKey(), title: 'Week 1', description: '', isPublished: true, lessons: [], days: [newDay('Day 1')] }])}>
                  Add first week
                </Button>
              </div>
            }
          />
        ) : null}
        {weeks.map((w, wi) => (
          <div key={w.key} className={cn('rounded-2xl border border-ivory-300 bg-ivory-50/60', !w.isPublished && 'opacity-75')}>
            <div className="flex flex-col gap-4 border-b border-ivory-200 p-4 sm:flex-row sm:items-start">
              <span className="flex h-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 px-3 font-display text-sm font-semibold text-white">W{wi + 1}</span>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <FormField label={`Week ${wi + 1} title`} htmlFor={`${w.key}-title`} required error={w.title.trim().length > 0 && w.title.trim().length < 2 ? 'At least 2 characters' : undefined}>
                  <Input id={`${w.key}-title`} value={w.title} onChange={(e) => updateWeek(wi, { title: e.target.value })} placeholder="e.g. Makeup Basics" />
                </FormField>
                <FormField label="Week description" htmlFor={`${w.key}-desc`}>
                  <Input id={`${w.key}-desc`} value={w.description} onChange={(e) => updateWeek(wi, { description: e.target.value })} placeholder="Optional summary" />
                </FormField>
                <Checkbox id={`${w.key}-pub`} label="Published" description="Unpublished weeks are hidden from students" checked={w.isPublished} onChange={(e) => updateWeek(wi, { isPublished: e.target.checked })} />
              </div>
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                <MoveButtons label="week" index={wi} count={weeks.length} onMove={(to) => edit((ws) => move(ws, wi, to))} />
                <Button variant="ghost" size="icon" aria-label="Remove week" className="text-red-600 hover:bg-red-50" onClick={() => edit((ws) => ws.filter((_, i) => i !== wi))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {w.lessons.length ? (
              <div className="border-b border-ivory-200">
                <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-charcoal-500">Lessons without a day</p>
                {lessonRows(wi, null, w.lessons, w.days)}
              </div>
            ) : null}

            <div className="space-y-3 p-4">
              {w.days.map((d, di) => {
                dayNumber += 1;
                return (
                  <div key={d.key} className={cn('rounded-xl border border-ivory-300 bg-white', !d.isPublished && 'opacity-75')}>
                    <div className="flex flex-col gap-3 border-b border-ivory-200 p-3 sm:flex-row sm:items-start">
                      <span className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 px-2.5 text-xs font-semibold text-gold-800">Day {dayNumber}</span>
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <FormField label="Day title" htmlFor={`${d.key}-title`} required error={d.title.trim().length > 0 && d.title.trim().length < 2 ? 'At least 2 characters' : undefined}>
                          <Input id={`${d.key}-title`} value={d.title} onChange={(e) => updateDay(wi, di, { title: e.target.value })} placeholder="e.g. Skin Preparation and Makeup Products" />
                        </FormField>
                        <FormField label="Day topics" htmlFor={`${d.key}-desc`} hint="Shown to students even before lessons are added">
                          <Input id={`${d.key}-desc`} value={d.description} onChange={(e) => updateDay(wi, di, { description: e.target.value })} placeholder="Optional" />
                        </FormField>
                        <Checkbox id={`${d.key}-pub`} label="Published" checked={d.isPublished} onChange={(e) => updateDay(wi, di, { isPublished: e.target.checked })} />
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                        <MoveButtons label="day" index={di} count={w.days.length} onMove={(to) => updateWeek(wi, (x) => ({ days: move(x.days, di, to) }))} />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove day"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => updateWeek(wi, (x) => ({ days: x.days.filter((_, j) => j !== di) }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {lessonRows(wi, di, d.lessons, w.days)}
                    <div className="p-3 pt-2">
                      <Button variant="outline" size="sm" onClick={() => updateLessons(wi, di, (ls) => [...ls, newLesson()])} leftIcon={<Plus className="h-4 w-4" />}>
                        Add lesson
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => updateWeek(wi, (x) => ({ days: [...x.days, newDay(`Day ${dayNumber + 1}`)] }))} leftIcon={<Plus className="h-4 w-4" />}>
                Add day
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
      <CardFooter>
        {dirty ? <span className="mr-auto text-xs text-charcoal-500">Unsaved curriculum changes</span> : null}
        <Button
          variant="ghost"
          onClick={() => {
            setWeeks(fromCourse(course));
            setDirty(false);
          }}
          disabled={!dirty || curriculum.isPending}
        >
          Discard
        </Button>
        <Button onClick={() => void save()} loading={curriculum.isPending} disabled={!dirty || invalid} leftIcon={<Save className="h-4 w-4" />}>
          Save curriculum
        </Button>
      </CardFooter>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AdminCourseEditorPage = () => {
  const { courseId } = useParams();
  const course = useAdminCourse(courseId);
  const editing = !!courseId;

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link to="/admin/courses" className="inline-flex items-center gap-1 hover:text-rose-700">
            <ArrowLeft className="h-4 w-4" /> Courses
          </Link>
        }
        title={editing ? (course.data?.title ?? 'Edit course') : 'New course'}
        description={editing ? 'Update course details and maintain the curriculum. Changes to published courses go live immediately.' : 'Create the course first; you can build the curriculum once it is saved.'}
      />
      {editing && course.isLoading ? (
        <LoadingSkeleton variant="page" />
      ) : editing && (course.error || !course.data) ? (
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      ) : (
        <div className="space-y-8">
          <CourseDetailsForm course={course.data} />
          {course.data ? <CurriculumEditor course={course.data} /> : <InlineAlert tone="info">The curriculum editor becomes available after the course is created.</InlineAlert>}
        </div>
      )}
    </div>
  );
};

export default AdminCourseEditorPage;
