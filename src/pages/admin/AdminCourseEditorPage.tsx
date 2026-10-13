import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useAdminCourse, useAdminTrainers, useCourseMutations } from '@/hooks/useAdmin';
import type { CurriculumModuleInput } from '@/services';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { formatDuration } from '@/lib/utils';
import type { Course, CourseUpsertRequest, LessonType } from '@/types';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Checkbox, EmptyState, ErrorState, FormField, ImageWithFallback, InlineAlert, Input, LoadingSkeleton, PageHeader, Select, StatusBadge, Textarea, useToast } from '@/components/ui';

// ---------------------------------------------------------------------------
// Course details form
// ---------------------------------------------------------------------------

const numberField = (msg: string) => z.number({ invalid_type_error: msg });
const base = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(120, 'At most 120 characters'),
  shortDescription: z.string().trim().min(10, 'At least 10 characters').max(200, 'At most 200 characters'),
  description: z.string().trim().min(20, 'At least 20 characters').max(4000, 'At most 4000 characters'),
  thumbnailUrl: z.string().trim().url('Enter a valid image URL').or(z.literal('')),
  trainerId: z.string().min(1, 'Select a trainer'),
  durationWeeks: numberField('Enter the duration in weeks').int('Whole weeks only').min(1, 'At least 1 week'),
  totalHours: numberField('Enter the total hours').min(1, 'At least 1 hour'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.enum(['live', 'recorded', 'hybrid']),
  price: numberField('Enter a price').min(0, 'Cannot be negative'),
  discountPrice: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, 'Enter a valid amount or leave blank'),
  status: z.enum(['draft', 'published', 'unpublished']),
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
const schema = base.refine((v) => v.discountPrice === '' || Number(v.discountPrice) < v.price, { message: 'Must be lower than the price', path: ['discountPrice'] });
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS = Object.keys(base.shape);

const EMPTY: FormValues = {
  title: '',
  shortDescription: '',
  description: '',
  thumbnailUrl: '',
  trainerId: '',
  durationWeeks: 4,
  totalHours: 20,
  level: 'beginner',
  format: 'recorded',
  price: 0,
  discountPrice: '',
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
  trainerId: c.trainer.id,
  durationWeeks: c.durationWeeks,
  totalHours: c.totalHours,
  level: c.level,
  format: c.format,
  price: c.price,
  discountPrice: c.discountPrice === null ? '' : String(c.discountPrice),
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

const toPayload = (v: FormValues): CourseUpsertRequest => ({
  title: v.title,
  shortDescription: v.shortDescription,
  description: v.description,
  thumbnailUrl: v.thumbnailUrl,
  trainerId: v.trainerId,
  durationWeeks: v.durationWeeks,
  totalHours: v.totalHours,
  level: v.level,
  format: v.format,
  price: v.price,
  discountPrice: v.discountPrice === '' ? null : Number(v.discountPrice),
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
  const { create, update } = useCourseMutations();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
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
              <FormField label="Trainer" htmlFor="trainerId" error={errors.trainerId?.message} required className="sm:col-span-2">
                <Select id="trainerId" invalid={!!errors.trainerId} {...register('trainerId')}>
                  <option value="">Select a trainer</option>
                  {trainers.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title}
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
              <FormField label="Duration (weeks)" htmlFor="durationWeeks" error={errors.durationWeeks?.message} required>
                <Input id="durationWeeks" type="number" min={1} step={1} invalid={!!errors.durationWeeks} {...register('durationWeeks', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Total hours" htmlFor="totalHours" error={errors.totalHours?.message} required>
                <Input id="totalHours" type="number" min={1} step={0.5} invalid={!!errors.totalHours} {...register('totalHours', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Price (INR)" htmlFor="price" error={errors.price?.message} required>
                <Input id="price" type="number" min={0} step={1} invalid={!!errors.price} {...register('price', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Discount price (INR)" htmlFor="discountPrice" error={errors.discountPrice?.message} hint="Leave blank for no discount">
                <Input id="discountPrice" inputMode="decimal" placeholder="—" invalid={!!errors.discountPrice} {...register('discountPrice')} />
              </FormField>
              <FormField label="Status" htmlFor="status" error={errors.status?.message} hint="Publishing from here also requires at least one lesson" required>
                <Select id="status" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
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
// Curriculum editor
// ---------------------------------------------------------------------------

interface LessonDraft {
  key: string;
  id?: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isRequired: boolean;
  summary: string;
}
interface ModuleDraft {
  key: string;
  id?: string;
  title: string;
  description: string;
  lessons: LessonDraft[];
}

let keySeq = 0;
const nextKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;
const LESSON_TYPES: LessonType[] = ['video', 'reading', 'live', 'assessment'];

const fromCourse = (course: Course): ModuleDraft[] =>
  [...course.modules]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      key: m.id,
      id: m.id,
      title: m.title,
      description: m.description,
      lessons: [...m.lessons].sort((a, b) => a.order - b.order).map((l) => ({ key: l.id, id: l.id, title: l.title, type: l.type, durationMinutes: l.durationMinutes, isRequired: l.isRequired, summary: l.summary })),
    }));

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const CurriculumEditor = ({ course }: { course: Course }) => {
  const toast = useToast();
  const { curriculum } = useCourseMutations();
  const [modules, setModules] = useState<ModuleDraft[]>(() => fromCourse(course));
  const [dirty, setDirty] = useState(false);

  // Same rule as the details form: only adopt a strictly newer server version, and never over unsaved edits.
  const syncedAt = useRef(course.updatedAt);
  useEffect(() => {
    if (!dirty && course.updatedAt > syncedAt.current) {
      syncedAt.current = course.updatedAt;
      setModules(fromCourse(course));
    }
  }, [course, dirty]);

  const edit = (fn: (m: ModuleDraft[]) => ModuleDraft[]) => {
    setModules(fn);
    setDirty(true);
  };
  const updateModule = (mi: number, patch: Partial<ModuleDraft>) => edit((ms) => ms.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  const updateLesson = (mi: number, li: number, patch: Partial<LessonDraft>) => edit((ms) => ms.map((m, i) => (i === mi ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) } : m)));

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const totalMinutes = modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + (l.durationMinutes || 0), 0), 0);
  const invalid = modules.some((m) => m.title.trim().length < 2 || m.lessons.some((l) => l.title.trim().length < 2));

  const save = async () => {
    const payload: CurriculumModuleInput[] = modules.map((m) => ({
      id: m.id,
      title: m.title.trim(),
      description: m.description.trim(),
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title.trim(), type: l.type, durationMinutes: Math.max(1, Math.round(l.durationMinutes || 1)), isRequired: l.isRequired, summary: l.summary.trim() })),
    }));
    try {
      const updated = await curriculum.mutateAsync({ id: course.id, modules: payload });
      syncedAt.current = updated.updatedAt;
      setModules(fromCourse(updated));
      setDirty(false);
      toast.success('Curriculum saved', `${updated.modules.length} module${updated.modules.length === 1 ? '' : 's'} saved.`);
    } catch (e) {
      toast.error('Could not save curriculum', getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader
        title="Curriculum"
        description={`${modules.length} module${modules.length === 1 ? '' : 's'} · ${totalLessons} lesson${totalLessons === 1 ? '' : 's'} · ${formatDuration(totalMinutes)}`}
        action={
          <Button variant="secondary" size="sm" onClick={() => edit((ms) => [...ms, { key: nextKey(), title: '', description: '', lessons: [] }])} leftIcon={<Plus className="h-4 w-4" />}>
            Add module
          </Button>
        }
      />
      <CardBody className="space-y-5">
        {modules.length === 0 ? (
          <EmptyState title="No modules yet" description="Add a module, then add lessons inside it. A course needs at least one lesson before it can be published." compact action={<Button onClick={() => edit((ms) => [...ms, { key: nextKey(), title: 'Module 1', description: '', lessons: [] }])}>Add first module</Button>} />
        ) : null}
        {modules.map((m, mi) => (
          <div key={m.key} className="rounded-2xl border border-ivory-300 bg-ivory-50/60">
            <div className="flex flex-col gap-4 border-b border-ivory-200 p-4 sm:flex-row sm:items-start">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 font-display text-sm font-semibold text-white">{mi + 1}</span>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <FormField label="Module title" htmlFor={`${m.key}-title`} required error={m.title.trim().length > 0 && m.title.trim().length < 2 ? 'At least 2 characters' : undefined}>
                  <Input id={`${m.key}-title`} value={m.title} onChange={(e) => updateModule(mi, { title: e.target.value })} placeholder="e.g. Foundations of skin prep" />
                </FormField>
                <FormField label="Module description" htmlFor={`${m.key}-desc`}>
                  <Input id={`${m.key}-desc`} value={m.description} onChange={(e) => updateModule(mi, { description: e.target.value })} placeholder="Optional summary" />
                </FormField>
              </div>
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                <Button variant="ghost" size="icon" aria-label="Move module up" disabled={mi === 0} onClick={() => edit((ms) => move(ms, mi, mi - 1))}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Move module down" disabled={mi === modules.length - 1} onClick={() => edit((ms) => move(ms, mi, mi + 1))}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Remove module" className="text-red-600 hover:bg-red-50" onClick={() => edit((ms) => ms.filter((_, i) => i !== mi))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ul className="divide-y divide-ivory-200">
              {m.lessons.map((l, li) => (
                <li key={l.key} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-12">
                  <FormField label="Lesson title" htmlFor={`${l.key}-title`} required className="lg:col-span-4" error={l.title.trim().length > 0 && l.title.trim().length < 2 ? 'At least 2 characters' : undefined}>
                    <Input id={`${l.key}-title`} value={l.title} onChange={(e) => updateLesson(mi, li, { title: e.target.value })} />
                  </FormField>
                  <FormField label="Type" htmlFor={`${l.key}-type`} className="lg:col-span-2">
                    <Select id={`${l.key}-type`} value={l.type} onChange={(e) => updateLesson(mi, li, { type: e.target.value as LessonType })}>
                      {LESSON_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t[0].toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Minutes" htmlFor={`${l.key}-dur`} className="lg:col-span-2">
                    <Input id={`${l.key}-dur`} type="number" min={1} value={l.durationMinutes} onChange={(e) => updateLesson(mi, li, { durationMinutes: Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Summary" htmlFor={`${l.key}-sum`} className="sm:col-span-2 lg:col-span-4">
                    <Input id={`${l.key}-sum`} value={l.summary} onChange={(e) => updateLesson(mi, li, { summary: e.target.value })} placeholder="Optional" />
                  </FormField>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-12">
                    <Checkbox id={`${l.key}-req`} label="Required for completion" checked={l.isRequired} onChange={(e) => updateLesson(mi, li, { isRequired: e.target.checked })} className="py-2" />
                    <div className="flex items-center gap-1">
                      {l.type === 'live' ? <Badge tone="rose">Matches a live session by title</Badge> : null}
                      <Button variant="ghost" size="icon" aria-label="Move lesson up" disabled={li === 0} onClick={() => updateModule(mi, { lessons: move(m.lessons, li, li - 1) })}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Move lesson down" disabled={li === m.lessons.length - 1} onClick={() => updateModule(mi, { lessons: move(m.lessons, li, li + 1) })}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Remove lesson" className="text-red-600 hover:bg-red-50" onClick={() => updateModule(mi, { lessons: m.lessons.filter((_, j) => j !== li) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-4 pt-2">
              <Button variant="outline" size="sm" onClick={() => updateModule(mi, { lessons: [...m.lessons, { key: nextKey(), title: '', type: 'video', durationMinutes: 15, isRequired: true, summary: '' }] })} leftIcon={<Plus className="h-4 w-4" />}>
                Add lesson
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
      <CardFooter>
        {dirty ? <span className="mr-auto text-xs text-charcoal-500">Unsaved curriculum changes</span> : null}
        <Button variant="ghost" onClick={() => { setModules(fromCourse(course)); setDirty(false); }} disabled={!dirty || curriculum.isPending}>
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
