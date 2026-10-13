import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-2xl border border-ivory-300 bg-white shadow-soft', className)} {...props} />
);

export const CardHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-ivory-200 px-5 py-4 sm:px-6', className)}>
    <div>
      <h3 className="font-display text-xl font-semibold text-charcoal-900">{title}</h3>
      {description ? <p className="mt-0.5 text-sm text-charcoal-500">{description}</p> : null}
    </div>
    {action}
  </div>
);

export const CardBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn('px-5 py-5 sm:px-6', className)} {...props} />;

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-wrap items-center justify-end gap-3 border-t border-ivory-200 px-5 py-4 sm:px-6', className)} {...props} />
);

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) => (
  <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
    {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
    <h2 className="font-display text-3xl font-semibold leading-tight text-charcoal-900 sm:text-4xl">{title}</h2>
    {description ? <p className="mt-4 text-base leading-relaxed text-charcoal-500 sm:text-lg">{description}</p> : null}
  </div>
);

export const PageHeader = ({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {breadcrumb ? <div className="mb-2 text-sm text-charcoal-500">{breadcrumb}</div> : null}
      <h1 className="font-display text-3xl font-semibold text-charcoal-900 sm:text-4xl">{title}</h1>
      {description ? <p className="mt-1.5 max-w-2xl text-sm text-charcoal-500 sm:text-base">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);
