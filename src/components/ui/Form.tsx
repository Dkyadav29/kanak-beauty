import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-xl border border-ivory-300 bg-white px-3.5 text-sm text-charcoal-800 placeholder:text-charcoal-500/60 transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:bg-ivory-100 disabled:text-charcoal-500';

export const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('space-y-1.5', className)}>
    {label ? (
      <label htmlFor={htmlFor} className="block text-sm font-medium text-charcoal-800">
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </label>
    ) : null}
    {children}
    {error ? (
      <p role="alert" className="text-xs font-medium text-red-600">
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-charcoal-500">{hint}</p>
    ) : null}
  </div>
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, leftIcon, ...props }, ref) => (
  <div className="relative">
    {leftIcon ? <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-charcoal-500">{leftIcon}</span> : null}
    <input ref={ref} className={cn(base, 'h-11', leftIcon && 'pl-10', invalid && 'border-red-400 focus:border-red-400 focus:ring-red-100', className)} aria-invalid={invalid || undefined} {...props} />
  </div>
));
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[96px] py-2.5', invalid && 'border-red-400 focus:border-red-400 focus:ring-red-100', className)} aria-invalid={invalid || undefined} {...props} />
));
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, invalid, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'h-11 cursor-pointer appearance-none bg-[url("data:image/svg+xml;utf8,<svg_xmlns=%27http://www.w3.org/2000/svg%27_width=%2716%27_height=%2716%27_fill=%27none%27_stroke=%27%235b5b63%27_stroke-width=%272%27><path d=%27m4 6 4 4 4-4%27/></svg>")] bg-[length:16px] bg-[position:right_0.9rem_center] bg-no-repeat pr-10', invalid && 'border-red-400', className)} aria-invalid={invalid || undefined} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }>(
  ({ label, description, className, id, ...props }, ref) => (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border border-ivory-300 bg-white p-3.5 transition-colors hover:border-rose-200', className)}>
      <input ref={ref} id={id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ivory-300 accent-rose-600" {...props} />
      <span>
        <span className="block text-sm font-medium text-charcoal-800">{label}</span>
        {description ? <span className="block text-xs text-charcoal-500">{description}</span> : null}
      </span>
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';

export const Switch = ({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; id: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-ivory-300 bg-white p-3.5">
    <label htmlFor={id} className="cursor-pointer">
      <span className="block text-sm font-medium text-charcoal-800">{label}</span>
      {description ? <span className="block text-xs text-charcoal-500">{description}</span> : null}
    </label>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-rose-600' : 'bg-ivory-300')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5 left-0' : 'left-0.5')} />
    </button>
  </div>
);
