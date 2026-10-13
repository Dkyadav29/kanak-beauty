import type { ReactNode } from 'react';
import { IMAGES } from '@/config/images';
import { ImageWithFallback } from '@/components/ui';

export const AuthCard = ({ title, description, children, footer, aside }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode; aside?: ReactNode }) => (
  <div className="container-x py-10 lg:py-16">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-ivory-300 bg-white shadow-lift lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden lg:block">
        <ImageWithFallback src={IMAGES.heroSecondary} alt="" className="absolute inset-0 h-full w-full object-cover" fallbackLabel="Kanak" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="eyebrow text-gold-300!">Kanak Beauty Academy</p>
          <p className="mt-2 font-display text-3xl font-semibold leading-tight">Train with experts. Build a career you love.</p>
          {aside ? <div className="mt-4 text-sm text-white/80">{aside}</div> : null}
        </div>
      </div>
      <div className="p-6 sm:p-10">
        <h1 className="font-display text-3xl font-semibold text-charcoal-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-charcoal-500">{description}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-charcoal-500">{footer}</div> : null}
      </div>
    </div>
  </div>
);
