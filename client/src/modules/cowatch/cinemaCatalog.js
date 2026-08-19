/**
 * CoGether Co-Watch Entertainment Catalog
 * 3 Pillars: Movies & Series, Anime Universe & Live Sports Arena
 * OTT Platforms: Netflix, Disney+ Hotstar, Amazon Prime Video, Aha Video, Crunchyroll, Live Sports Hubs
 */

export const ENTERTAINMENT_PILLARS = [
  {
    id: 'movies',
    label: 'Movies & Series',
    icon: '🎬',
    tagline: 'Stream Blockbusters, Regional Cinema & Web Series with Friends'
  },
  {
    id: 'anime',
    label: 'Anime Universe',
    icon: '⛩️',
    tagline: 'Simulcasts, Shonen Legends & Movies from Crunchyroll, Netflix & Muse'
  },
  {
    id: 'sports',
    label: 'Live Sports Arena',
    icon: '🏆',
    tagline: 'Live Cricket, Football, Formula 1, Basketball & Stadium Atmosphere'
  }
];

export const OTT_PLATFORMS = [
  {
    id: 'all',
    name: 'All Platforms',
    shortCode: 'ALL',
    badge: 'ALL OTT',
    color: '#ffffff'
  },
  {
    id: 'netflix',
    name: 'Netflix',
    shortCode: 'N',
    badge: 'NETFLIX 4K',
    color: '#ff0033',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg'
  },
  {
    id: 'hotstar',
    name: 'Disney+ Hotstar',
    shortCode: 'D+',
    badge: 'HOTSTAR',
    color: '#FFE500',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg'
  },
  {
    id: 'prime',
    name: 'Prime Video',
    shortCode: 'PV',
    badge: 'PRIME',
    color: '#ffffff',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg'
  },
  {
    id: 'aha',
    name: 'Aha Video',
    shortCode: 'AHA',
    badge: '100% TELUGU',
    color: '#FFE500',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Aha_OTT_Platform_Logo.png'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    shortCode: 'CR',
    badge: 'ANIME 4K',
    color: '#FFE500',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png'
  },
  {
    id: 'sports_live',
    name: 'Live Sports Hub',
    shortCode: 'LIVE',
    badge: 'STADIUM LIVE',
    color: '#ff0033'
  },
  {
    id: 'youtube_4k',
    name: 'YouTube 4K Theater',
    shortCode: 'YT',
    badge: 'FREE 4K',
    color: '#ffffff'
  }
];

export const CINEMA_DATABASE = [
  // =========================================================================
  // 1. MOVIES & SERIES (Hollywood, Bollywood, Tollywood & Originals)
  // =========================================================================
  {
    id: 'hanuman-4k',
    pillar: 'movies',
    title: 'Hanu-Man (4K Master)',
    category: 'Superhero / Mythology / Action',
    language: 'Telugu / Hindi / Multi',
    platformId: 'aha',
    platformName: 'Aha & Hotstar',
    platformBadge: '4K DOLBY VISION',
    rating: '8.7',
    year: '2024',
    duration: '2h 38m',
    cast: 'Teja Sajja, Amritha Aiyer, Varalaxmi',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'An ordinary boy in the fictional village of Anjanadri gains the supreme superpowers of Lord Hanuman to protect his people from evil greed.',
    embedUrl: 'https://www.youtube.com/embed/gkJ3wZqV_9k?autoplay=1'
  },
  {
    id: 'stranger-things-netflix',
    pillar: 'movies',
    title: 'Stranger Things: Season 4',
    category: 'Sci-Fi / Horror / Mystery',
    language: 'English / Hindi Dubbed',
    platformId: 'netflix',
    platformName: 'Netflix Original',
    platformBadge: 'NETFLIX TOP #1',
    rating: '8.8',
    year: '2024',
    duration: 'Series (9 Ep)',
    cast: 'Millie Bobby Brown, Finn Wolfhard, Winona Ryder',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    embedUrl: 'https://www.youtube.com/embed/yQEondeGvCE?autoplay=1'
  },
  {
    id: 'oppenheimer-prime',
    pillar: 'movies',
    title: 'Oppenheimer (IMAX 4K)',
    category: 'Biographical / Drama / History',
    language: 'English / Multi-Audio',
    platformId: 'prime',
    platformName: 'Amazon Prime Video',
    platformBadge: '7 OSCAR WINNER',
    rating: '8.9',
    year: '2023',
    duration: '3h 00m',
    cast: 'Cillian Murphy, Emily Blunt, Matt Damon, RDJ',
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    embedUrl: 'https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1'
  },
  {
    id: 'salaar-hotstar',
    pillar: 'movies',
    title: 'Salaar: Part 1 – Ceasefire',
    category: 'Action / Crime / Thriller',
    language: 'Telugu / Hindi / Tamil',
    platformId: 'hotstar',
    platformName: 'Disney+ Hotstar',
    platformBadge: 'BLOCKBUSTER',
    rating: '8.2',
    year: '2024',
    duration: '2h 55m',
    cast: 'Prabhas, Prithviraj Sukumaran, Shruti Haasan',
    poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A gang leader makes a promise to a dying friend and takes on other criminal gangs in the dystopian city of Khansaar.',
    embedUrl: 'https://www.youtube.com/embed/4GPvYMKtrtI?autoplay=1'
  },
  {
    id: 'sita-ramam-free',
    pillar: 'movies',
    title: 'Sita Ramam (Epic Romance)',
    category: 'Romance / Drama / Classic',
    language: 'Telugu / Tamil / Hindi',
    platformId: 'youtube_4k',
    platformName: 'CoGether Free Theater',
    platformBadge: 'FREE 4K FULL MOVIE',
    rating: '8.6',
    year: '2022',
    duration: '2h 43m',
    cast: 'Dulquer Salmaan, Mrunal Thakur, Rashmika',
    poster: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'An orphaned soldier serving at the Kashmir border receives anonymous love letters from Sita Mahalakshmi. He embarks on a mission to find her.',
    embedUrl: 'https://www.youtube.com/embed/e3D4j6rV9_0?autoplay=1'
  },
  {
    id: 'interstellar-imax',
    pillar: 'movies',
    title: 'Interstellar (IMAX Master)',
    category: 'Sci-Fi / Space / Adventure',
    language: 'English',
    platformId: 'prime',
    platformName: 'Prime & Apple TV',
    platformBadge: '4K HDR',
    rating: '8.7',
    year: '2014',
    duration: '2h 49m',
    cast: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
    embedUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E?autoplay=1'
  },

  // =========================================================================
  // 2. ANIME UNIVERSE (Crunchyroll, Netflix Anime, Muse & Ani-One)
  // =========================================================================
  {
    id: 'jujutsu-kaisen-s2',
    pillar: 'anime',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    category: 'Shonen / Supernatural / Dark Action',
    language: 'Japanese (Sub/Dub)',
    platformId: 'crunchyroll',
    platformName: 'Crunchyroll & Netflix',
    platformBadge: 'ANIME OF THE YEAR',
    rating: '8.9',
    year: '2024',
    duration: '23 Episodes',
    cast: 'Gojo Satoru, Yuji Itadori, Sukuna',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'On October 31st, a barrier suddenly falls over Shibuya during Halloween. Special Grade Sorcerer Gojo Satoru enters the trap alone to protect humanity.',
    embedUrl: 'https://www.youtube.com/embed/O6qVieflwqs?autoplay=1'
  },
  {
    id: 'attack-on-titan-final',
    pillar: 'anime',
    title: 'Attack on Titan: The Final Chapters',
    category: 'Seinen / Epic / Dark Fantasy',
    language: 'Japanese / English / Hindi',
    platformId: 'crunchyroll',
    platformName: 'Crunchyroll',
    platformBadge: 'LEGENDARY FINALE',
    rating: '9.1',
    year: '2023',
    duration: 'Special Finale',
    cast: 'Eren Yeager, Mikasa Ackerman, Levi',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The fate of the world hangs in the balance as Eren unleashes the ultimate power of the Colossal Titans in The Rumbling.',
    embedUrl: 'https://www.youtube.com/embed/M_OauHnAFc8?autoplay=1'
  },
  {
    id: 'demon-slayer-hashira',
    pillar: 'anime',
    title: 'Demon Slayer: Hashira Training',
    category: 'Action / Demon / Historical Fantasy',
    language: 'Japanese / English / Hindi Dub',
    platformId: 'netflix',
    platformName: 'Netflix & Crunchyroll',
    platformBadge: 'SIMULCAST 4K',
    rating: '8.7',
    year: '2024',
    duration: 'Season 4',
    cast: 'Tanjiro Kamado, Nezuko, Hashiras',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'Tanjiro visits the Stone Hashira, Himejima, who intends to prepare him for the battles to come against Muzan Kibutsuji.',
    embedUrl: 'https://www.youtube.com/embed/6JnFzHj2x0c?autoplay=1'
  },
  {
    id: 'solo-leveling-s1',
    pillar: 'anime',
    title: 'Solo Leveling (Arise)',
    category: 'Action / Fantasy / System Leveling',
    language: 'Japanese / Korean / English',
    platformId: 'crunchyroll',
    platformName: 'Crunchyroll Exclusive',
    platformBadge: '#1 TRENDING',
    rating: '8.6',
    year: '2024',
    duration: 'Season 1 (12 Ep)',
    cast: 'Sung Jin-woo, Cha Hae-In',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'In a world where hunters must battle deadly monsters, Sung Jin-woo, the weakest hunter of all mankind, awakens a mysterious player quest log.',
    embedUrl: 'https://www.youtube.com/embed/9msb1I_a57o?autoplay=1'
  },
  {
    id: 'one-piece-egghead',
    pillar: 'anime',
    title: 'One Piece: Egghead Island Arc',
    category: 'Shonen / Adventure / Pirate Legend',
    language: 'Japanese (Weekly Simulcast)',
    platformId: 'netflix',
    platformName: 'Netflix & Crunchyroll',
    platformBadge: 'WEEKLY LIVE',
    rating: '9.0',
    year: '2024',
    duration: 'Ongoing',
    cast: 'Monkey D. Luffy (Gear 5), Dr. Vegapunk',
    poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The Straw Hat Pirates arrive on the futuristic Island of Egghead, where the genius scientist Dr. Vegapunk holds secrets of the Void Century.',
    embedUrl: 'https://www.youtube.com/embed/l_98K4_6UQ0?autoplay=1'
  },

  // =========================================================================
  // 3. LIVE SPORTS ARENA (Cricket, Football, Formula 1, Basketball, UFC)
  // =========================================================================
  {
    id: 'live-cricket-ipl',
    pillar: 'sports',
    title: 'ICC & IPL World Cricket Arena',
    category: 'Cricket / Live Stadium / 4K Stream',
    language: 'English / Hindi / Telugu Commentary',
    platformId: 'sports_live',
    platformName: 'JioCinema & Hotstar Live',
    platformBadge: 'STADIUM 4K LIVE',
    rating: 'LIVE',
    year: '2024',
    duration: 'Live Match (T20 / ODI)',
    cast: 'India vs Australia / Super Match Showcase',
    poster: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'Experience electrifying world cricket action with synchronized ball-by-ball audio and squad video cheer rooms with your friends.',
    embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1'
  },
  {
    id: 'uefa-champions-league',
    pillar: 'sports',
    title: 'UEFA Champions League: Final',
    category: 'Football / Live Derby / European Cup',
    language: 'English / Spanish Audio',
    platformId: 'sports_live',
    platformName: 'Sony LIV & Sports Hub',
    platformBadge: 'LIVE DERBY',
    rating: 'LIVE',
    year: '2024',
    duration: 'Full 90m + Extra Time',
    cast: 'Real Madrid vs Bayern Munich (Showcase)',
    poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The pinnacle of European club football. Watch high-stakes goals, penalty shootouts and celebrate with your squad live in 4K.',
    embedUrl: 'https://www.youtube.com/embed/8A2U49jXh4w?autoplay=1'
  },
  {
    id: 'formula-1-grand-prix',
    pillar: 'sports',
    title: 'Formula 1: Monaco Grand Prix 4K',
    category: 'Motorsport / High-Speed / Live F1',
    language: 'English Team Radio & Pit Comm',
    platformId: 'sports_live',
    platformName: 'F1 TV & Hotstar',
    platformBadge: '300 KM/H 4K',
    rating: 'LIVE',
    year: '2024',
    duration: 'Race Day (78 Laps)',
    cast: 'Verstappen, Hamilton, Leclerc, Norris',
    poster: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'High-octane street circuit racing through the iconic streets of Monte Carlo with multi-camera onboard camera switching.',
    embedUrl: 'https://www.youtube.com/embed/3v4M4tB2h_k?autoplay=1'
  },
  {
    id: 'nba-finals-basketball',
    pillar: 'sports',
    title: 'NBA Finals: Championship Showdown',
    category: 'Basketball / NBA Live / Slam Dunks',
    language: 'English Arena Broadcast',
    platformId: 'sports_live',
    platformName: 'NBA League Pass & JioCinema',
    platformBadge: 'CHAMPIONSHIP',
    rating: 'LIVE',
    year: '2024',
    duration: '4 Quarters (48m Live)',
    cast: 'Celtics vs Mavericks (Championship Game)',
    poster: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'High-flying slam dunks, clutch buzzer-beaters and court-side audio synchronization for ultimate hoop fans.',
    embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1'
  }
];
