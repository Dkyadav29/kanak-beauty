import { useEffect, useId, useMemo, useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 2_000_000;

/**
 * Pick / replace / remove one image (signature, stamp, logo) with a preview on a paper-coloured
 * background, so a transparent PNG looks the way it will on the certificate.
 * `current` is the saved image (data: URI or URL); `pending` a newly chosen file not yet saved.
 */
export const ImagePickerField = ({
  label,
  hint,
  current,
  pending,
  removed = false,
  onPick,
  onRemove,
  onError,
  busy = false,
  className,
}: {
  label: string;
  hint?: string;
  current: string | null | undefined;
  pending?: File | null;
  removed?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  busy?: boolean;
  className?: string;
}) => {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);
  useEffect(() => () => (pendingUrl ? URL.revokeObjectURL(pendingUrl) : undefined), [pendingUrl]);
  const shown = pendingUrl ?? (removed ? null : current);

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return onError('Upload a PNG, JPG or WebP image.');
    if (file.size > MAX_BYTES) return onError('The image must be smaller than 2 MB.');
    onPick(file);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-charcoal-800">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gold-300 bg-[#f6efe4]">
          {shown ? <img src={shown} alt={`${label} preview`} className="max-h-full max-w-full object-contain p-1.5" /> : <span className="text-xs text-charcoal-500">Not uploaded</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()} leftIcon={<ImagePlus className="h-4 w-4" />}>
            {shown ? 'Replace' : 'Upload'}
          </Button>
          {shown ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove} leftIcon={<Trash2 className="h-4 w-4" />} className="text-red-600 hover:bg-red-50">
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-charcoal-500">{hint}</p> : null}
    </div>
  );
};
