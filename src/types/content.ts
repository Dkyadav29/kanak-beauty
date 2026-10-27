/** Which part of a hero photo stays visible when it is cropped to the banner frame. */
export type HeroSlideFocus = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'left-top' | 'right-top' | 'left-bottom' | 'right-bottom';

/** GET /hero-slides: active slides in display order. ``imageUrl`` may be relative to the API host. */
export interface PublicHeroSlide {
  id: string;
  imageUrl: string;
  alt: string;
  eyebrow: string;
  caption: string;
  focus: HeroSlideFocus;
}

/** GET /admin/hero-slides: every slide, including hidden ones. */
export interface AdminHeroSlide extends PublicHeroSlide {
  /** True when the image was uploaded to the academy server, false for an external URL. */
  imageUploaded: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body. Send either ``image`` (a file) or ``imageUrl``, never both. */
export interface HeroSlideInput {
  image?: File;
  imageUrl?: string;
  alt?: string;
  eyebrow?: string;
  caption?: string;
  focus?: HeroSlideFocus;
  isActive?: boolean;
}

export type HomeVideoProvider = 'youtube' | 'vimeo' | 'drive' | 'file';

/** GET /home-video: the section under the hero; `enabled: false` when hidden or not set up. */
export type PublicHomeVideo =
  | { enabled: false }
  | {
      enabled: true;
      eyebrow: string;
      title: string;
      description: string;
      provider: HomeVideoProvider;
      /** iframe src (YouTube/Vimeo/Drive) or the video file URL (provider "file"). */
      embedUrl: string;
      /** Custom poster, else the YouTube thumbnail; null when neither exists. */
      posterUrl: string | null;
      buttonLabel: string;
      buttonUrl: string;
    };

/** GET/PUT /admin/home-video. */
export interface AdminHomeVideo {
  isActive: boolean;
  eyebrow: string;
  title: string;
  description: string;
  /** The link the admin pasted. */
  videoUrl: string;
  /** Derived from videoUrl; null when it is empty or unsupported. */
  provider: HomeVideoProvider | null;
  embedUrl: string | null;
  posterUrl: string | null;
  /** The admin's own poster image ('' = use the YouTube thumbnail). */
  customPosterUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  updatedAt: string;
}

export interface HomeVideoInput {
  isActive: boolean;
  eyebrow: string;
  title: string;
  description: string;
  videoUrl: string;
  posterUrl: string;
  buttonLabel: string;
  buttonUrl: string;
}

/** GET /site-settings: branding used on every page. `logoUrl` is null when the text logo is used. */
export interface SiteSettings {
  logoUrl: string | null;
  logoAlt: string;
  updatedAt: string;
}

export type PolicySlug = 'terms' | 'privacy' | 'refund';

/** One published version of a legal document (content is plain text with ## headings and - bullets). */
export interface PolicyVersion {
  id: string;
  slug: PolicySlug;
  version: number;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  publishedByName: string | null;
}
