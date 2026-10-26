import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Save } from 'lucide-react';
import { useAdminHomeVideo, useUpdateHomeVideo } from '@/hooks/useAdmin';
import { ApiError, getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils';
import type { AdminHomeVideo, HomeVideoInput } from '@/types';
import { HomeVideoPlayer } from '@/components/shared/HomeVideoPlayer';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ErrorState, FormField, InlineAlert, Input, LoadingSkeleton, PageHeader, Textarea, useToast } from '@/components/ui';

const PROVIDER_LABEL = { youtube: 'YouTube', vimeo: 'Vimeo', drive: 'Google Drive', file: 'Video file' } as const;

const schema = z
  .object({
    isActive: z.boolean(),
    eyebrow: z.string().trim().max(60, 'At most 60 characters'),
    title: z.string().trim().max(120, 'At most 120 characters'),
    description: z.string().trim().max(400, 'At most 400 characters'),
    videoUrl: z.string().trim().max(1000),
    posterUrl: z.union([z.literal(''), z.string().trim().regex(/^https:\/\/\S+$/i, 'Enter an https image URL')]),
    buttonLabel: z.string().trim().max(40, 'At most 40 characters'),
    buttonUrl: z.union([z.literal(''), z.string().trim().regex(/^(https:\/\/\S+|\/(?!\/)\S*)$/i, 'Use a site path like /courses or an https link')]),
  })
  .superRefine((v, ctx) => {
    if (v.isActive && !v.title) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'Add a title before showing the section' });
    if (v.isActive && !v.videoUrl) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['videoUrl'], message: 'Add a video link before showing the section' });
    if (!!v.buttonLabel !== !!v.buttonUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [v.buttonLabel ? 'buttonUrl' : 'buttonLabel'], message: 'Fill in both the button text and its link, or leave both empty' });
    }
  });
type FormValues = z.infer<typeof schema>;
const FIELDS: Array<keyof FormValues> = ['isActive', 'eyebrow', 'title', 'description', 'videoUrl', 'posterUrl', 'buttonLabel', 'buttonUrl'];

const toValues = (v?: AdminHomeVideo): FormValues => ({
  isActive: v?.isActive ?? false,
  eyebrow: v?.eyebrow ?? '',
  title: v?.title ?? '',
  description: v?.description ?? '',
  videoUrl: v?.videoUrl ?? '',
  posterUrl: v?.customPosterUrl ?? '',
  buttonLabel: v?.buttonLabel ?? '',
  buttonUrl: v?.buttonUrl ?? '',
});

const AdminHomeVideoPage = () => {
  const video = useAdminHomeVideo();
  const update = useUpdateHomeVideo();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues() });
  const { register, handleSubmit, reset, setError, formState } = form;
  const { errors } = formState;

  useEffect(() => {
    if (video.data) reset(toValues(video.data));
  }, [video.data, reset]);

  const save = async (values: FormValues) => {
    setServerError(null);
    try {
      await update.mutateAsync(values as HomeVideoInput);
      toast.success(values.isActive ? 'Video section is live on the home page' : 'Video section saved (hidden)');
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        Object.entries(e.details).forEach(([field, msgs]) => {
          if ((FIELDS as string[]).includes(field)) setError(field as keyof FormValues, { message: msgs[0] });
        });
      }
      setServerError(getErrorMessage(e));
    }
  };

  if (video.isLoading) return <LoadingSkeleton variant="page" />;
  if (video.error || !video.data) return <ErrorState error={video.error} onRetry={() => void video.refetch()} />;
  const saved = video.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Video"
        description="A video section shown on the home page directly below the hero slider. Paste a YouTube, Vimeo or Google Drive link, or a direct .mp4 link."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline">
            View home page <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card className="self-start">
          <CardHeader title="Section content" description="Changes go live as soon as you save." />
          <CardBody>
            {serverError ? (
              <InlineAlert tone="danger" className="mb-4">
                {serverError}
              </InlineAlert>
            ) : null}
            <form onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
              <Checkbox id="hv-active" label="Show on the home page" description="Turn off to hide the section; your content is kept." {...register('isActive')} />
              <FormField label="Video link" htmlFor="hv-url" error={errors.videoUrl?.message} hint="YouTube, Vimeo, Google Drive (shared: Anyone with the link) or an https .mp4/.webm file." required>
                <Input id="hv-url" type="url" placeholder="https://www.youtube.com/watch?v=..." invalid={!!errors.videoUrl} {...register('videoUrl')} />
              </FormField>
              <FormField label="Small label" htmlFor="hv-eyebrow" error={errors.eyebrow?.message} hint="Optional, e.g. Inside the academy">
                <Input id="hv-eyebrow" invalid={!!errors.eyebrow} {...register('eyebrow')} />
              </FormField>
              <FormField label="Title" htmlFor="hv-title" error={errors.title?.message} required>
                <Input id="hv-title" placeholder="See how we train beauty professionals" invalid={!!errors.title} {...register('title')} />
              </FormField>
              <FormField label="Description" htmlFor="hv-desc" error={errors.description?.message} hint="Optional, up to 400 characters">
                <Textarea id="hv-desc" rows={3} invalid={!!errors.description} {...register('description')} />
              </FormField>
              <FormField label="Poster image URL" htmlFor="hv-poster" error={errors.posterUrl?.message} hint="Optional. Shown before the video plays; YouTube videos use their own thumbnail when empty.">
                <Input id="hv-poster" type="url" placeholder="https://…" invalid={!!errors.posterUrl} {...register('posterUrl')} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Button text" htmlFor="hv-btn" error={errors.buttonLabel?.message} hint="Optional, e.g. Explore courses">
                  <Input id="hv-btn" invalid={!!errors.buttonLabel} {...register('buttonLabel')} />
                </FormField>
                <FormField label="Button link" htmlFor="hv-btn-url" error={errors.buttonUrl?.message} hint="e.g. /courses or https://…">
                  <Input id="hv-btn-url" invalid={!!errors.buttonUrl} {...register('buttonUrl')} />
                </FormField>
              </div>
              <Button type="submit" loading={update.isPending} leftIcon={<Save className="h-4 w-4" />}>
                Save
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader
            title="Live preview"
            description={`Last saved ${formatDateTime(saved.updatedAt)}. The preview shows the saved version.`}
            action={
              <Badge tone={saved.isActive ? 'success' : 'neutral'} dot>
                {saved.isActive ? 'Live' : 'Hidden'}
              </Badge>
            }
          />
          <CardBody>
            {saved.provider && saved.embedUrl ? (
              <div className="space-y-4">
                <HomeVideoPlayer key={saved.embedUrl} provider={saved.provider} embedUrl={saved.embedUrl} posterUrl={saved.posterUrl} title={saved.title || 'Video'} />
                <div>
                  {saved.eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">{saved.eyebrow}</p> : null}
                  <p className="font-display text-2xl font-semibold text-charcoal-900">{saved.title || <span className="text-charcoal-500">No title yet</span>}</p>
                  {saved.description ? <p className="mt-1 text-sm text-charcoal-600">{saved.description}</p> : null}
                  <p className="mt-2 text-xs text-charcoal-500">Source: {PROVIDER_LABEL[saved.provider]}</p>
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-3xl border border-dashed border-ivory-300 text-sm text-charcoal-500">Save a video link to see the preview</div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default AdminHomeVideoPage;
