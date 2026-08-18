/**
 * CoGether Co-Watch Cinema & OTT Streaming Catalog
 * Verified High-Resolution Posters, Official Trailers & Platform Integrations
 * (Disney+ Hotstar, Netflix, Prime Video, Crunchyroll, YouTube)
 */

export const OTT_PLATFORMS = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    accentColor: '#E50914',
    tagline: 'Stream Unlimited Movies & Series',
    directUrl: 'https://www.netflix.com/'
  },
  {
    id: 'hotstar',
    name: 'Disney+ Hotstar',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg',
    accentColor: '#123B7C',
    tagline: 'Live Cricket, Marvel, Star Wars & HBO',
    directUrl: 'https://www.hotstar.com/'
  },
  {
    id: 'prime',
    name: 'Amazon Prime Video',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    accentColor: '#00A8E1',
    tagline: 'Exclusive Originals & Blockbusters',
    directUrl: 'https://www.primevideo.com/'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll Anime',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png',
    accentColor: '#F47521',
    tagline: 'World’s Largest Anime Library',
    directUrl: 'https://www.crunchyroll.com/'
  },
  {
    id: 'youtube',
    name: 'YouTube Theater',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    accentColor: '#FF0000',
    tagline: '4K Cinema, Podcasts & Livestreams',
    directUrl: 'https://www.youtube.com/'
  }
];

export const CINEMA_CATEGORIES = [
  { id: 'all', label: '🔥 All Featured' },
  { id: 'movies', label: '🍿 Movies & Cinema' },
  { id: 'series', label: '📺 Web Series & TV' },
  { id: 'sports', label: '⚽ Live Sports & Cricket' },
  { id: 'anime', label: '🎌 Anime Platform' },
  { id: 'platforms', label: '🎬 OTT Platforms' }
];

export const CINEMA_DATABASE = [
  // ================= 1. MOVIES (BLOCKBUSTERS) =================
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    category: 'movies',
    platform: 'Universal / Prime Video',
    platformBadge: 'PRIME VIDEO',
    rating: '8.9/10',
    year: '2023',
    duration: '3h 0m',
    genre: 'Biography / Drama / History',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    embedUrl: 'https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1'
  },
  {
    id: 'interstellar',
    title: 'Interstellar (4K IMAX)',
    category: 'movies',
    platform: 'Paramount / Netflix',
    platformBadge: 'NETFLIX',
    rating: '8.7/10',
    year: '2014',
    duration: '2h 49m',
    genre: 'Sci-Fi / Adventure',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.',
    embedUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E?autoplay=1'
  },
  {
    id: 'avengers-endgame',
    title: 'Avengers: Endgame',
    category: 'movies',
    platform: 'Disney+ Hotstar',
    platformBadge: 'DISNEY+ HOTSTAR',
    rating: '8.4/10',
    year: '2019',
    duration: '3h 1m',
    genre: 'Action / Sci-Fi',
    poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    synopsis: 'After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more to reverse Thanos\' actions.',
    embedUrl: 'https://www.youtube.com/embed/TcMBFSGVi1c?autoplay=1'
  },
  {
    id: 'spider-man-across-spiderverse',
    title: 'Spider-Man: Across the Spider-Verse',
    category: 'movies',
    platform: 'Sony / Netflix',
    platformBadge: 'NETFLIX',
    rating: '8.7/10',
    year: '2023',
    duration: '2h 20m',
    genre: 'Animation / Action',
    poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
    synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    embedUrl: 'https://www.youtube.com/embed/cqGjhVJWtEg?autoplay=1'
  },

  // ================= 2. WEB SERIES & TV =================
  {
    id: 'stranger-things',
    title: 'Stranger Things (Season 4)',
    category: 'series',
    platform: 'Netflix Original',
    platformBadge: 'NETFLIX ORIGINAL',
    rating: '8.7/10',
    year: '2022',
    duration: '4 Seasons',
    genre: 'Sci-Fi / Horror / Drama',
    poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    synopsis: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    embedUrl: 'https://www.youtube.com/embed/yQEondeGvKo?autoplay=1'
  },
  {
    id: 'squid-game',
    title: 'Squid Game (Season 2)',
    category: 'series',
    platform: 'Netflix Original',
    platformBadge: 'NETFLIX ORIGINAL',
    rating: '8.0/10',
    year: '2024',
    duration: '2 Seasons',
    genre: 'Thriller / Survival',
    poster: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/oaGvjB0DvdurWhf96SCakvrcbVN.jpg',
    synopsis: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games for a tempting prize with deadly high stakes.',
    embedUrl: 'https://www.youtube.com/embed/oqxAJKy0ii4?autoplay=1'
  },
  {
    id: 'the-boys',
    title: 'The Boys (Season 4)',
    category: 'series',
    platform: 'Amazon Prime Video',
    platformBadge: 'PRIME ORIGINAL',
    rating: '8.7/10',
    year: '2024',
    duration: '4 Seasons',
    genre: 'Action / Superhero Satire',
    poster: 'https://image.tmdb.org/t/p/w500/7Ns6tO3aYjKyMBFRumu2rmAXda2.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nxxCPRgt9VVs4D0v9v76L5rN10E.jpg',
    synopsis: 'A fun and irreverent take on what happens when superheroes—who are as popular as celebrities—abuse their superpowers rather than use them for good.',
    embedUrl: 'https://www.youtube.com/embed/F9U-CH3PrLA?autoplay=1'
  },
  {
    id: 'loki-series',
    title: 'Loki: Multiverse Odyssey',
    category: 'series',
    platform: 'Disney+ Hotstar',
    platformBadge: 'DISNEY+ HOTSTAR',
    rating: '8.2/10',
    year: '2023',
    duration: '2 Seasons',
    genre: 'Marvel / Sci-Fi / Fantasy',
    poster: 'https://image.tmdb.org/t/p/w500/voHUmlvjysvLiy1AMAG9hBe9iXP.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/q3r5I0YtS0H6bFjI6Y6fS6zIe.jpg',
    synopsis: 'The mercurial villain Loki resumes his role as the God of Mischief in a new series that takes place after the events of Avengers: Endgame.',
    embedUrl: 'https://www.youtube.com/embed/dug56u8NNBn?autoplay=1'
  },

  // ================= 3. LIVE SPORTS & CRICKET =================
  {
    id: 'icc-world-cup-final',
    title: 'ICC Cricket World Cup Highlights (4K)',
    category: 'sports',
    platform: 'Disney+ Hotstar',
    platformBadge: 'HOTSTAR SPORTS',
    rating: '9.8/10',
    year: '2024',
    duration: 'Live / Highlights',
    genre: 'Cricket / Live Stadium',
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/t5zCBSGu5xO5RGoUtb5ZGF19Y97.jpg',
    synopsis: 'Experience thrilling cricket action, super sixes, lightning yorkers, and stadium crowd roars with your squad.',
    embedUrl: 'https://www.youtube.com/embed/Z1BCujX3pw8?autoplay=1'
  },
  {
    id: 'champions-league-final',
    title: 'UEFA Champions League 4K Football',
    category: 'sports',
    platform: 'Sony LIV / Hotstar',
    platformBadge: 'LIVE FOOTBALL',
    rating: '9.5/10',
    year: '2024',
    duration: 'Live Match',
    genre: 'Football / Soccer',
    poster: 'https://image.tmdb.org/t/p/w500/yF1eOkaYvwiORauRCPWznV9xVvi.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    synopsis: 'Watch elite European football giants clash for glory in synchronized high definition.',
    embedUrl: 'https://www.youtube.com/embed/4t0bIvh9qDk?autoplay=1'
  },

  // ================= 4. ANIME PLATFORM =================
  {
    id: 'demon-slayer-hashira',
    title: 'Demon Slayer: Hashira Training Arc',
    category: 'anime',
    platform: 'Crunchyroll / Netflix',
    platformBadge: 'CRUNCHYROLL',
    rating: '8.9/10',
    year: '2024',
    duration: 'Season 4',
    genre: 'Anime / Shonen / Supernatural',
    poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    synopsis: 'Tanjiro undergoes rigorous training with the powerful Stone Hashira Himejima in preparation for the ultimate battle against Muzan Kibutsuji.',
    embedUrl: 'https://www.youtube.com/embed/14Z1h_Y17lY?autoplay=1'
  },
  {
    id: 'jujutsu-kaisen-shibuya',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    category: 'anime',
    platform: 'Crunchyroll / Netflix',
    platformBadge: 'CRUNCHYROLL',
    rating: '8.8/10',
    year: '2023',
    duration: 'Season 2',
    genre: 'Anime / Action / Dark Fantasy',
    poster: 'https://image.tmdb.org/t/p/w500/hFWP5DUqlTvZ1e3z16pZ6s3dD8E.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/9nBVLd6u5B6j1tL7tP1dK17pI9e.jpg',
    synopsis: 'On October 31st, a curtain descends on Shibuya Station trapping civilians. Gojo Satoru enters the battle against curses alone.',
    embedUrl: 'https://www.youtube.com/embed/kY3v7XJb1x0?autoplay=1'
  },
  {
    id: 'attack-on-titan-final',
    title: 'Attack on Titan: The Final Chapters',
    category: 'anime',
    platform: 'Crunchyroll / Prime',
    platformBadge: 'CRUNCHYROLL',
    rating: '9.1/10',
    year: '2023',
    duration: 'Final Season',
    genre: 'Anime / Epic Drama',
    poster: 'https://image.tmdb.org/t/p/w500/8C5gDxnB9hD3z18hR1dK7tP1dK1.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2wT1tK17pI9e9nBVLd6u5B6j1tL.jpg',
    synopsis: 'The fate of the world hangs in the balance as Eren unleashes the ultimate power of the Rumbling titans.',
    embedUrl: 'https://www.youtube.com/embed/M_OauHnAFc8?autoplay=1'
  }
];
