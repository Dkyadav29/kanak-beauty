import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useAdminCourseCategories, useCourseCategoryMutations } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import type { CourseCategory, CourseCategoryUpsertRequest } from '@/types';
import { Badge, Button, Checkbox, ConfirmationDialog, DataTable, Dialog, FormField, InlineAlert, Input, PageHeader, useToast, type Column } from '@/components/ui';

const days = z.string().trim().regex(/^(\d{1,5})?$/, 'Whole days, or leave blank');
const schema = z
  .object({
    name: z.string().trim().min(2, 'At least 2 characters').max(80),
    description: z.string().trim().max(240),
    minDays: days,
    maxDays: days,
    order: z.number({ invalid_type_error: 'Enter a number' }).int().min(0).max(1000),
    isActive: z.boolean(),
  })
  .refine((v) => v.minDays === '' || v.maxDays === '' || Number(v.maxDays) >= Number(v.minDays), { message: 'Must be at least the minimum', path: ['maxDays'] });
type FormValues = z.infer<typeof schema>;
const FIELD_KEYS: Array<keyof FormValues> = ['name', 'description', 'minDays', 'maxDays', 'order', 'isActive'];

const toValues = (c: CourseCategory | null): FormValues => ({
  name: c?.name ?? '',
  description: c?.description ?? '',
  minDays: c?.minDays == null ? '' : String(c.minDays),
  maxDays: c?.maxDays == null ? '' : String(c.maxDays),
  order: c?.order ?? 0,
  isActive: c?.isActive ?? true,
});

const toPayload = (v: FormValues): CourseCategoryUpsertRequest => ({
  name: v.name,
  description: v.description,
  minDays: v.minDays === '' ? null : Number(v.minDays),
  maxDays: v.maxDays === '' ? null : Number(v.maxDays),
  order: v.order,
  isActive: v.isActive,
});

const rangeLabel = (c: Pick<CourseCategory, 'minDays' | 'maxDays'>) =>
  c.minDays == null && c.maxDays == null ? 'Any duration' : c.maxDays == null ? `${c.minDays}+ days` : `${c.minDays ?? 1}–${c.maxDays} days`;

const CategoryFormDialog = ({ open, category, onClose }: { open: boolean; category: CourseCategory | null; onClose: () => void }) => {
  const toast = useToast();
  const { create, update } = useCourseCategoryMutations();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(category) });

  useEffect(() => {
    if (open) {
      reset(toValues(category));
      setServerError(null);
    }
  }, [open, category, reset]);

  const submit = async (values: FormValues) => {
    setServerError(null);
    try {
      const saved = category ? await update.mutateAsync({ id: category.id, payload: toPayload(values) }) : await create.mutateAsync(toPayload(values));
      toast.success(category ? 'Category saved' : 'Category added', `"${saved.name}" is ${saved.isActive ? 'active' : 'inactive'}.`);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if (FIELD_KEYS.includes(field as keyof FormValues)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  const formId = 'category-form';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={category ? 'Edit category' : 'Add category'}
      description="Courses without an explicit category are placed in the first active category whose day range covers their duration."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {category ? 'Save changes' : 'Add category'}
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
        <FormField label="Name" htmlFor="cat-name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="cat-name" autoComplete="off" invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Description" htmlFor="cat-desc" error={errors.description?.message} className="sm:col-span-2">
          <Input id="cat-desc" placeholder="e.g. 10 days to 1 month" {...register('description')} />
        </FormField>
        <FormField label="Minimum days" htmlFor="cat-min" error={errors.minDays?.message} hint="Blank = no minimum">
          <Input id="cat-min" inputMode="numeric" invalid={!!errors.minDays} {...register('minDays')} />
        </FormField>
        <FormField label="Maximum days" htmlFor="cat-max" error={errors.maxDays?.message} hint="Blank = no maximum">
          <Input id="cat-max" inputMode="numeric" invalid={!!errors.maxDays} {...register('maxDays')} />
        </FormField>
        <FormField label="Display order" htmlFor="cat-order" error={errors.order?.message}>
          <Input id="cat-order" type="number" min={0} {...register('order', { valueAsNumber: true })} />
        </FormField>
        <div className="flex items-end">
          <Checkbox id="cat-active" label="Active" description="Shown on the website and used for automatic placement" {...register('isActive')} />
        </div>
      </form>
    </Dialog>
  );
};

const AdminCourseCategoriesPage = () => {
  const toast = useToast();
  const categories = useAdminCourseCategories();
  const { remove } = useCourseCategoryMutations();
  const [editing, setEditing] = useState<CourseCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CourseCategory | null>(null);

  const openForm = (c: CourseCategory | null) => {
    setEditing(c);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Category deleted', `"${deleting.name}" was removed.`);
    } catch (e) {
      toast.error('Could not delete category', getErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  const columns: Column<CourseCategory>[] = [
    { key: 'name', header: 'Category', render: (c) => <span className="font-medium text-charcoal-900">{c.name}</span> },
    { key: 'range', header: 'Duration range', render: (c) => rangeLabel(c), hideBelow: 'sm' },
    { key: 'courses', header: 'Courses', render: (c) => c.courseCount ?? 0, align: 'right' },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (c) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${c.name}`}
          className="text-red-600 hover:bg-red-50"
          disabled={(c.courseCount ?? 0) > 0}
          title={(c.courseCount ?? 0) > 0 ? 'Move its courses or deactivate it instead' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setDeleting(c);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Course categories"
        description="Group courses on the website, e.g. Short-Term (up to 1 month), Medium-Term (up to 3 months) and Long-Term."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add category
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={categories.data}
        rowKey={(c) => c.id}
        isLoading={categories.isLoading}
        error={categories.error}
        onRetry={() => void categories.refetch()}
        onRowClick={(c) => openForm(c)}
        emptyTitle="No categories yet"
        emptyDescription="Add a category to group courses on the website."
        caption="Course categories"
      />
      <CategoryFormDialog open={formOpen} category={editing} onClose={() => setFormOpen(false)} />
      <ConfirmationDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete category?"
        description={deleting ? `"${deleting.name}" will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
};

export default AdminCourseCategoriesPage;
