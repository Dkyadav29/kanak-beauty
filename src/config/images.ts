/**
 * Marketing imagery. These are royalty-free Unsplash photos used
 * as placeholders. Replace with approved academy photography before launch.
 * Every <ImageWithFallback> degrades gracefully if a URL is unavailable.
 */
const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGES = {
  hero: u('photo-1516975080664-ed2fc6a32937', 1600),
  heroSecondary: u('photo-1487412947147-5cebf100ffc2', 900),
  about: u('photo-1522337660859-02fbefca4702', 1400),
  courses: {
    makeup: u('photo-1512496015851-a90fb38ba796'),
    bridal: u('photo-1515377905703-c4788e51af15'),
    hair: u('photo-1562322140-8baeececf3df'),
    skincare: u('photo-1570172619644-dfd03ed5d881'),
    nails: u('photo-1604654894610-df63bc536371'),
    salon: u('photo-1560066984-138dadb4c035'),
  },
  gallery: [
    u('photo-1596462502278-27bfdc403348', 800),
    u('photo-1522335789203-aabd1fc54bc9', 800),
    u('photo-1588681664899-f142ff2dc9b1', 800),
    u('photo-1457972729786-0411a3b2b626', 800),
    u('photo-1519699047748-de8e457a634e', 800),
    u('photo-1583001931096-959e9a1a6223', 800),
    u('photo-1540555700478-4be289fbecef', 800),
    u('photo-1595476108010-b4d1f102b1b1', 800),
  ],
  avatars: {
    trainer1: u('photo-1494790108377-be9c29b29330', 300),
    trainer2: u('photo-1531746020798-e6953c6e8e04', 300),
    trainer3: u('photo-1544005313-94ddf0286df2', 300),
    trainer4: u('photo-1580489944761-15a19d654956', 300),
  },
};
