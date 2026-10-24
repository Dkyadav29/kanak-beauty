import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Link2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useAdminHeroSlides, useHeroSlideMutations } from '@/hooks/useAdmin';
import { resolveApiUrl } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import type { AdminHeroSlide, HeroSlideFocus, HeroSlideInput } from '@/types';
import { FOCUS_CLASS } from '@/components/shared/HeroSlider';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmationDialog,
  Dialog,
  EmptyState,
  ErrorState,
  FormField,
  ImageWithFallback,
  InlineAlert,
  Input,
  LoadingSkeleton,
  PageHeader,
  Select,
  Tabs,
  useToast,
} from '@/components/ui';

const MAX_IMAGE_BYTES = 5_000_000;

const FOCUS_OPTIONS: Array<{ value: HeroSlideFocus; label: string }> = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'left-top', label: 'Left top' },
  { value: 'right-top', label: 'Right top' },
  { value: 'left-bottom', label: 'Left bottom' },
  { value: 'right-bottom', label: 'Right bottom' },
];

const schema = z
  .object({
    source: z.enum(['upload', 'url']),
    imageUrl: z.string().trim(),
    alt: z.string().trim().min(2, 'Describe the image in a few words').max(200),
    eyebrow: z.string().trim().max(60, 'Keep the label under 60 characters'),
    caption: z.string().trim().max(160, 'Keep the caption under 160 characters'),
    focus: z.enum(['center', 'top', 'bottom', 'left', 'right', 'left-top', 'right-top', 'left-bottom', 'right-bottom']),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.source === 'url' && !/^https?:\/\/\S+$/i.test(v.imageUrl)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['imageUrl'], message: 'Enter a valid http(s) image URL' });
    }
  });
type FormValues = z.infer<typeof schema>;

const defaultsFor = (slide: AdminHeroSlide | null): FormValues => ({
  source: slide && !slide.imageUploaded ? 'url' : 'upload',
  imageUrl: slide && !slide.imageUploaded ? slide.imageUrl : '',
  alt: slide?.alt ?? '',
  eyebrow: slide?.eyebrow ?? '',
  caption: slide?.caption ?? '',
  focus: slide?.focus ?? 'center',
  isActive: slide?.isActive ?? true,
});

/** Banner-shaped preview that crops exactly like the home page slider. */
const SlidePreview = ({ src, alt, focus, className }: { src?: string; alt: string; focus: HeroSlideFocus; className?: string }) => (
  <ImageWithFallback key={src} src={src} alt={alt} className={cn('aspect-[21/9] w-full rounded-xl border border-ivory-300 object-cover', FOCUS_CLASS[focus], className)} fallbackLabel="No image" />
);

const HeroSlideFormDialog = ({ open, slide, onClose }: { open: boolean; slide: AdminHeroSlide | null; onClose: () => void }) => {
  const { create, update } = useHeroSlideMutations();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaultsFor(slide) });
  const { register, watch, setValue, formState } = form;

  useEffect(() => {
    if (!open) return;
    form.reset(defaultsFor(slide));
    setFile(null);
    setFileError(null);
  }, [open, slide, form]);

  const source = watch('source');
  const imageUrl = watch('imageUrl');
  const focus = watch('focus');
  const alt = watch('alt');

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (fileUrl ? URL.revokeObjectURL(fileUrl) : undefined), [fileUrl]);

  const previewSrc =
    source === 'upload' ? (fileUrl ?? (slide?.imageUploaded ? resolveApiUrl(slide.imageUrl) : undefined)) : imageUrl.trim() || undefined;

  const pickFile = (picked: File | undefined) => {
    setFileError(null);
    if (!picked) return setFile(null);
    if (!picked.type.startsWith('image/')) return setFileError('Choose an image file (JPG, PNG, WebP, AVIF or GIF).');
    if (picked.size > MAX_IMAGE_BYTES) return setFileError('Image must be smaller than 5 MB.');
    setFile(picked);
  };

  const submit = async (v: FormValues) => {
    const input: HeroSlideInput = { alt: v.alt, eyebrow: v.eyebrow, caption: v.caption, focus: v.focus, isActive: v.isActive };
    if (v.source === 'upload') {
      if (file) input.image = file;
      else if (!slide?.imageUploaded) return setFileError('Choose an image to upload.');
    } else if (!slide || slide.imageUploaded || v.imageUrl !== slide.imageUrl) {
      input.imageUrl = v.imageUrl;
    }
    try {
      if (slide) await update.mutateAsync({ id: slide.id, input });
      else await create.mutateAsync(input);
      toast.success(slide ? 'Slide updated' : 'Slide added');
      onClose();
    } catch (e) {
      toast.error('Could not save the slide', getErrorMessage(e));
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={slide ? 'Edit slide' : 'Add slide'}
      description="Wide landscape photos work best (at least 1600 px across). The preview shows how the banner crops it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="hero-slide-form" loading={saving}>
            {slide ? 'Save changes' : 'Add slide'}
          </Button>
        </>
      }
    >
      <form id="hero-slide-form" onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
        <Tabs
          items={[
            { value: 'upload', label: 'Upload image' },
            { value: 'url', label: 'Image URL' },
          ]}
          value={source}
          onChange={(v) => setValue('source', v as FormValues['source'], { shouldValidate: formState.isSubmitted })}
        />

        {source === 'upload' ? (
          <FormField
            label="Image file"
            htmlFor="heroImage"
            error={fileError ?? undefined}
            hint={slide?.imageUploaded && !file ? 'Leave empty to keep the current image.' : 'JPG, PNG, WebP, AVIF or GIF, up to 5 MB.'}
          >
            <Input id="heroImage" type="file" accept="image/*" invalid={!!fileError} className="py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-rose-700" onChange={(e) => pickFile(e.target.files?.[0])} />
          </FormField>
        ) : (
          <FormField label="Image URL" htmlFor="heroImageUrl" error={formState.errors.imageUrl?.message} hint="A direct link to a publicly hosted image.">
            <Input id="heroImageUrl" type="url" placeholder="https://…" invalid={!!formState.errors.imageUrl} {...register('imageUrl')} />
          </FormField>
        )}

        <SlidePreview src={previewSrc} alt={alt || 'Slide preview'} focus={focus} />

        <FormField label="Keep visible when cropped" htmlFor="heroFocus" hint="On narrow screens the photo is cropped; choose the part that must stay in view.">
          <Select id="heroFocus" {...register('focus')}>
            {FOCUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Image description" htmlFor="heroAlt" required error={formState.errors.alt?.message} hint="Read aloud by screen readers, e.g. “A bride with finished bridal makeup”.">
          <Input id="heroAlt" invalid={!!formState.errors.alt} {...register('alt')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <FormField label="Label" htmlFor="heroEyebrow" error={formState.errors.eyebrow?.message} hint="Optional, e.g. Bridal artistry">
            <Input id="heroEyebrow" invalid={!!formState.errors.eyebrow} {...register('eyebrow')} />
          </FormField>
          <FormField label="Caption" htmlFor="heroCaption" error={formState.errors.caption?.message} hint="Optional headline shown over the photo">
            <Input id="heroCaption" invalid={!!formState.errors.caption} {...register('caption')} />
          </FormField>
        </div>

        <Checkbox id="heroActive" label="Show on the home page" description="Hidden slides stay here and can be shown again later." {...register('isActive')} />
      </form>
    </Dialog>
  );
};

const AdminHeroSlidesPage = () => {
  const slides = useAdminHeroSlides();
  const { update, remove, reorder } = useHeroSlideMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminHeroSlide | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminHeroSlide | null>(null);

  const rows = slides.data ?? [];
  const visibleCount = rows.filter((s) => s.isActive).length;

  const openForm = (slide: AdminHeroSlide | null) => {
    setEditing(slide);
    setFormOpen(true);
  };

  const move = async (index: number, delta: -1 | 1) => {
    const ids = rows.map((s) => s.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    try {
      await reorder.mutateAsync(ids);
    } catch (e) {
      toast.error('Could not reorder slides', getErrorMessage(e));
    }
  };

  const toggle = async (slide: AdminHeroSlide) => {
    try {
      await update.mutateAsync({ id: slide.id, input: { isActive: !slide.isActive } });
      toast.success(slide.isActive ? 'Slide hidden from the home page' : 'Slide is live on the home page');
    } catch (e) {
      toast.error('Could not update the slide', getErrorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Slide removed');
      setDeleting(null);
    } catch (e) {
      toast.error('Could not remove the slide', getErrorMessage(e));
    }
  };

  const busy = reorder.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hero Slider"
        description="The banner carousel at the top of the public home page. Slides play in the order shown here."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add slide
          </Button>
        }
      />

      {slides.isLoading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : slides.error ? (
        <ErrorState error={slides.error} onRetry={() => void slides.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ImagePlus className="h-6 w-6" />}
          title="No slides yet"
          description="The home page shows no banner until you add a slide."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
              Add the first slide
            </Button>
          }
        />
      ) : (
        <>
          {visibleCount === 0 ? <InlineAlert tone="warning">Every slide is hidden, so the home page currently shows no banner.</InlineAlert> : null}
          <ol className="space-y-3" aria-label="Hero slides in display order">
            {rows.map((s, i) => (
              <li key={s.id} className={cn('card flex flex-col gap-4 p-4 sm:flex-row sm:items-center', !s.isActive && 'opacity-70')}>
                <div className="flex items-center gap-3 sm:w-72 sm:shrink-0">
                  <span className="w-6 text-center font-display text-lg font-semibold text-charcoal-500" aria-label={`Position ${i + 1}`}>
                    {i + 1}
                  </span>
                  <SlidePreview src={resolveApiUrl(s.imageUrl)} alt={s.alt} focus={s.focus} />
                </div>

                <div className="min-w-0 flex-1">
                  {s.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">{s.eyebrow}</p> : null}
                  <p className="truncate font-medium text-charcoal-900">{s.caption || <span className="text-charcoal-500">No caption</span>}</p>
                  <p className="truncate text-sm text-charcoal-500">{s.alt}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={s.isActive ? 'success' : 'neutral'} dot>
                      {s.isActive ? 'Visible' : 'Hidden'}
                    </Badge>
                    <Badge tone="info">
                      <span className="inline-flex items-center gap-1">
                        {s.imageUploaded ? <Upload className="h-3 w-3" aria-hidden /> : <Link2 className="h-3 w-3" aria-hidden />}
                        {s.imageUploaded ? 'Uploaded' : 'External URL'}
                      </span>
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0 || busy} onClick={() => void move(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === rows.length - 1 || busy} onClick={() => void move(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={s.isActive ? 'Hide slide' : 'Show slide'} disabled={busy} onClick={() => void toggle(s)}>
                    {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openForm(s)}>
                    Edit
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Remove slide" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <HeroSlideFormDialog open={formOpen} slide={editing} onClose={() => setFormOpen(false)} />

      <ConfirmationDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remove this slide?"
        description="It disappears from the home page straight away. An uploaded image is deleted from the server; this cannot be undone. To take it down temporarily, hide it instead."
        confirmLabel="Remove slide"
        variant="danger"
        loading={remove.isPending}
      />
    </div>
  );
};

export default AdminHeroSlidesPage;
