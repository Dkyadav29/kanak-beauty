import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeVideoProvider } from '@/types';

const withAutoplay = (url: string) => `${url}${url.includes('?') ? '&' : '?'}autoplay=1`;

/**
 * 16:9 player for the home page video section. It shows the poster and a play button
 * first and only loads the provider's iframe on click, so the home page stays fast and
 * no third-party player loads for visitors who never press play.
 */
export const HomeVideoPlayer = ({
  provider,
  embedUrl,
  posterUrl,
  title,
  className,
}: {
  provider: HomeVideoProvider;
  embedUrl: string;
  posterUrl: string | null;
  title: string;
  className?: string;
}) => {
  const [playing, setPlaying] = useState(false);
  const frame = cn('relative aspect-video w-full overflow-hidden rounded-3xl bg-charcoal-900 shadow-lift', className);

  if (playing) {
    return (
      <div className={frame}>
        {provider === 'file' ? (
          <video src={embedUrl} poster={posterUrl ?? undefined} controls autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <iframe
            src={provider === 'drive' ? embedUrl : withAutoplay(embedUrl)}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} className={cn(frame, 'group block text-left')} aria-label={`Play video: ${title}`}>
      {posterUrl ? (
        <img src={posterUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-rose-600 via-rose-700 to-charcoal-900" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-charcoal-900/10 to-transparent" aria-hidden />
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-rose-700 shadow-lift transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
          <Play className="relative ml-1 h-8 w-8 fill-current sm:h-10 sm:w-10" />
        </span>
      </span>
    </button>
  );
};
