/**
 * CoGether Co-Watch Cinema & OTT Streaming Catalog
 * Multi-Language: English, Hindi, Telugu, Multi-Language Pan-India & Free-to-Watch Cinema
 */

export const OTT_PLATFORMS = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    accentColor: '#E50914',
    tagline: 'Stream Unlimited Movies, Series & Anime',
    directUrl: 'https://www.netflix.com/'
  },
  {
    id: 'hotstar',
    name: 'Disney+ Hotstar',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg',
    accentColor: '#FFE500',
    tagline: 'Live Cricket, Marvel, Star Wars & Tollywood',
    directUrl: 'https://www.hotstar.com/'
  },
  {
    id: 'prime',
    name: 'Amazon Prime Video',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    accentColor: '#00A8E1',
    tagline: 'Blockbusters, Indian Originals & Anime',
    directUrl: 'https://www.primevideo.com/'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll Anime',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png',
    accentColor: '#F47521',
    tagline: 'World’s Largest Anime Streaming Library',
    directUrl: 'https://www.crunchyroll.com/'
  },
  {
    id: 'youtube',
    name: 'YouTube 4K Theater',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    accentColor: '#FF0000',
    tagline: '4K Free Movies, Podcasts & Livestreams',
    directUrl: 'https://www.youtube.com/'
  }
];

export const LANGUAGE_COMPARTMENTS = [
  { id: 'all', label: 'All Languages', icon: '🎬' },
  { id: 'free', label: 'Free to Watch', icon: '🆓' },
  { id: 'telugu', label: 'Telugu (Tollywood)', icon: '⚡' },
  { id: 'hindi', label: 'Hindi (Bollywood)', icon: '🎭' },
  { id: 'english', label: 'English (Hollywood)', icon: '🌟' },
  { id: 'multilingual', label: 'Multi-Language (Pan-India)', icon: '🌍' }
];

export const CINEMA_DATABASE = [
  // ================= 1. FREE TO WATCH =================
  {
    id: 'hanuman-free',
    title: 'Hanu-Man (4K Full Movie)',
    category: 'movies',
    language: 'telugu',
    isFree: true,
    platform: 'CoGether Free Cinema',
    platformBadge: 'FREE TO WATCH',
    rating: '8.7/10',
    year: '2024',
    duration: '2h 38m',
    genre: 'Mythology / Action / Superhero',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'An ordinary boy in the fictional village of Anjanadri gets the superpowers of Lord Hanuman and fights against evil forces.',
    embedUrl: 'https://www.youtube.com/embed/gkJ3wZqV_9k?autoplay=1'
  },
  {
    id: 'sita-ramam-free',
    title: 'Sita Ramam (Multi-Language)',
    category: 'movies',
    language: 'multilingual',
    isFree: true,
    platform: 'CoGether Free Cinema',
    platformBadge: 'FREE TO WATCH',
    rating: '8.6/10',
    year: '2022',
    duration: '2h 43m',
    genre: 'Romance / Drama / Classic',
    poster: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'An orphaned soldier serving at the Kashmir border receives anonymous love letters from Sita Mahalakshmi. He embarks on a mission to find her.',
    embedUrl: 'https://www.youtube.com/embed/e3D4j6rV9_0?autoplay=1'
  },
  {
    id: 'tears-of-steel-4k',
    title: 'Tears of Steel (4K Sci-Fi Classic)',
    category: 'movies',
    language: 'english',
    isFree: true,
    platform: 'Open Source 4K',
    platformBadge: 'FREE TO WATCH',
    rating: '8.2/10',
    year: '2024',
    duration: '45m',
    genre: 'Sci-Fi / Cyberpunk / VFX',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'In a dystopian future, a group of warriors in Amsterdam attempt to save the world with a high-tech memory reconstruction device.',
    embedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  },

  // ================= 2. TELUGU CINEMA (TOLLYWOOD) =================
  {
    id: 'kalki-2898-ad',
    title: 'Kalki 2898 AD',
    category: 'movies',
    language: 'telugu',
    isFree: false,
    platform: 'Netflix / Prime Video',
    platformBadge: 'TOLLYWOOD BLOCKBUSTER',
    rating: '8.8/10',
    year: '2024',
    duration: '3h 1m',
    genre: 'Mythology / Sci-Fi / Action',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A modern-day avatar of Vishnu descends in 2898 AD to protect humanity against the tyrannical ruler Supreme Yaskin.',
    embedUrl: 'https://www.youtube.com/embed/kQDd1AhGIHk?autoplay=1'
  },
  {
    id: 'rrr-telugu',
    title: 'RRR (Rise Roar Revolt)',
    category: 'movies',
    language: 'telugu',
    isFree: false,
    platform: 'Disney+ Hotstar / Netflix',
    platformBadge: 'OSCAR WINNER',
    rating: '8.9/10',
    year: '2022',
    duration: '3h 7m',
    genre: 'Action / Epic / Historical',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A fearless revolutionary and an officer in the British force decide to join forces to chart out a path towards freedom.',
    embedUrl: 'https://www.youtube.com/embed/NgBoAMQhHoc?autoplay=1'
  },
  {
    id: 'pushpa-2-the-rule',
    title: 'Pushpa 2: The Rule',
    category: 'movies',
    language: 'telugu',
    isFree: false,
    platform: 'Netflix',
    platformBadge: 'PAN-INDIA SENSATION',
    rating: '9.0/10',
    year: '2024',
    duration: '3h 4m',
    genre: 'Action / Crime / Thriller',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'Pushpa Raj continues to reign over the red sandalwood smuggling syndicate, clashing in a war of absolute power.',
    embedUrl: 'https://www.youtube.com/embed/g3JUbgHBg38?autoplay=1'
  },
  {
    id: 'salaar-part-1',
    title: 'Salaar: Part 1 - Ceasefire',
    category: 'movies',
    language: 'telugu',
    isFree: false,
    platform: 'Disney+ Hotstar / Netflix',
    platformBadge: 'PRASHANTH NEEL',
    rating: '8.4/10',
    year: '2023',
    duration: '2h 55m',
    genre: 'Action / Gangster / Drama',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A gang leader makes a promise to a dying friend and takes on other criminal syndicates in the dystopian city of Khansaar.',
    embedUrl: 'https://www.youtube.com/embed/4GPvYMKtrtI?autoplay=1'
  },

  // ================= 3. HINDI CINEMA (BOLLYWOOD) =================
  {
    id: 'jawan-hindi',
    title: 'Jawan (Extended Cut)',
    category: 'movies',
    language: 'hindi',
    isFree: false,
    platform: 'Netflix',
    platformBadge: 'BOLLYWOOD RECORD',
    rating: '8.4/10',
    year: '2023',
    duration: '2h 49m',
    genre: 'Action / Thriller / Social',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A man is driven by a personal vendetta to rectify the wrongs in society while keeping a promise made years ago.',
    embedUrl: 'https://www.youtube.com/embed/COv52Qyctws?autoplay=1'
  },
  {
    id: 'animal-hindi',
    title: 'Animal (Unrated 4K)',
    category: 'movies',
    language: 'hindi',
    isFree: false,
    platform: 'Netflix',
    platformBadge: 'SANDEEP REDDY VANGA',
    rating: '8.2/10',
    year: '2023',
    duration: '3h 24m',
    genre: 'Crime / Drama / Action',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A son undergoes a remarkable transformation as the bond with his father fractures, turning into a quest for vengeance.',
    embedUrl: 'https://www.youtube.com/embed/Dydmpfo68DA?autoplay=1'
  },
  {
    id: 'stree-2',
    title: 'Stree 2: Sarkate Ka Aatank',
    category: 'movies',
    language: 'hindi',
    isFree: false,
    platform: 'Prime Video',
    platformBadge: 'BLOCKBUSTER HIT',
    rating: '8.3/10',
    year: '2024',
    duration: '2h 27m',
    genre: 'Horror / Comedy / Mystery',
    poster: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The town of Chanderi is haunted once again by a headless entity abducting women. Vicky and friends join forces to save the town.',
    embedUrl: 'https://www.youtube.com/embed/KVn_0nF8XQ8?autoplay=1'
  },

  // ================= 4. ENGLISH CINEMA (HOLLYWOOD) =================
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    category: 'movies',
    language: 'english',
    isFree: false,
    platform: 'Universal / Prime Video',
    platformBadge: 'OSCAR BEST PICTURE',
    rating: '8.9/10',
    year: '2023',
    duration: '3h 0m',
    genre: 'Biography / Drama / History',
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    embedUrl: 'https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1'
  },
  {
    id: 'interstellar',
    title: 'Interstellar (4K IMAX)',
    category: 'movies',
    language: 'english',
    isFree: false,
    platform: 'Paramount / Netflix',
    platformBadge: 'CHRISTOPHER NOLAN',
    rating: '8.7/10',
    year: '2014',
    duration: '2h 49m',
    genre: 'Sci-Fi / Adventure',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    embedUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E?autoplay=1'
  },
  {
    id: 'dune-part-two',
    title: 'Dune: Part Two',
    category: 'movies',
    language: 'english',
    isFree: false,
    platform: 'HBO Max / Prime Video',
    platformBadge: 'DENIS VILLENEUVE',
    rating: '8.6/10',
    year: '2024',
    duration: '2h 46m',
    genre: 'Sci-Fi / Adventure / Epic',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    embedUrl: 'https://www.youtube.com/embed/Way9Dexny3w?autoplay=1'
  }
];
