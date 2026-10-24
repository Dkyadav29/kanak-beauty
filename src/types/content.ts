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
