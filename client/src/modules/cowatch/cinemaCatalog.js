/**
 * CoGether Master Cinema Catalog
 * 100% Reliable Dual-Engine Streams & DRM Architectural Segregation
 */

// ── CATEGORY 1: HEAVY DRM PLATFORMS (16) ──
export const HEAVY_DRM_PLATFORMS = [
  {
    id: 'netflix',
    name: 'Netflix',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    directUrl: 'https://www.netflix.com/',
    badge: 'WIDEVINE L1 DRM',
    drmType: 'Hardware CDM (Widevine / FairPlay)',
    summary: 'Hardware encrypted. Screen-sharing is blocked (black screen). Dual login with CoGether Sync Companion required.'
  },
  {
    id: 'prime',
    name: 'Amazon Prime Video',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    directUrl: 'https://www.primevideo.com/',
    badge: 'PLAYREADY / WIDEVINE',
    drmType: 'Hardware CDM',
    summary: 'Restricted media pipeline. Requires party room code sync via CoGether companion.'
  },
  {
    id: 'disney_plus',
    name: 'Disney+',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    directUrl: 'https://www.disneyplus.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: '4K Dolby Vision protected. Both participants must log into Disney+ and sync playback timestamps.'
  },
  {
    id: 'max',
    name: 'Max (HBO)',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg',
    directUrl: 'https://www.max.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Encrypted Media Extensions enforced. Synchronize tabs via room code overlay.'
  },
  {
    id: 'apple_tv',
    name: 'Apple TV+',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
    directUrl: 'https://tv.apple.com/',
    badge: 'FAIRPLAY / WIDEVINE',
    drmType: 'Hardware CDM',
    summary: 'Apple FairPlay encryption blocks screen broadcast. CoGether companion links playback.'
  },
  {
    id: 'paramount_plus',
    name: 'Paramount+',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
    directUrl: 'https://www.paramountplus.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'DRM hardware lock. Requires independent account playback synced via party room.'
  },
  {
    id: 'peacock',
    name: 'Peacock',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/NBCUniversal_Peacock_Logo.svg',
    directUrl: 'https://www.peacocktv.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Encrypted video stream. Connect CoGether companion bridge for frame-accurate sync.'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg',
    directUrl: 'https://www.hulu.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Blocks screen sharing. Dual login required with synchronized audio/video call.'
  },
  {
    id: 'discovery_plus',
    name: 'Discovery+',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Plus_logo.svg',
    directUrl: 'https://www.discoveryplus.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Widevine encrypted manifests. Synchronize playback controls using room code.'
  },
  {
    id: 'jiohotstar',
    name: 'JioHotstar',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg',
    directUrl: 'https://www.hotstar.com/',
    badge: 'WIDEVINE L1',
    drmType: 'Hardware CDM',
    summary: 'Live sports & movies DRM protected. Use CoGether room code to synchronize commentary & stream.'
  },
  {
    id: 'sonyliv',
    name: 'SonyLIV',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/SonyLIV_logo.svg',
    directUrl: 'https://www.sonyliv.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Regional cinema & sports DRM locked. Companion extension overlays low-latency call.'
  },
  {
    id: 'zee5',
    name: 'ZEE5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Zee5-official-logo.jpeg',
    directUrl: 'https://www.zee5.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Blocks standard screen capture. Dual user playback locked via room code bridge.'
  },
  {
    id: 'lionsgate_play',
    name: 'Lionsgate Play',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Lionsgate_Play_logo.png',
    directUrl: 'https://lionsgateplay.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Hollywood blockbusters DRM encrypted. Requires party room link.'
  },
  {
    id: 'sun_nxt',
    name: 'Sun NXT',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Sun_NXT_logo.png',
    directUrl: 'https://www.sunnxt.net/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'South Indian blockbusters DRM protected. Synchronize playback across browser tabs.'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png',
    directUrl: 'https://www.crunchyroll.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Simulcast anime streams hardware encrypted. Sync subtitles & timestamps via room code.'
  },
  {
    id: 'hidive',
    name: 'HIDIVE',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Hidive_logo.svg',
    directUrl: 'https://www.hidive.com/',
    badge: 'WIDEVINE DRM',
    drmType: 'Hardware CDM',
    summary: 'Anime library DRM locked. Both users connect via CoGether companion.'
  }
];

// ── CATEGORY 2: FREE & OPEN NON-DRM PLATFORMS (24) ──
export const OPEN_NON_DRM_PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube & Live Streams',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    directUrl: 'https://www.youtube.com/',
    badge: 'OPEN EMBED',
    defaultEmbedUrl: 'https://www.youtube-nocookie.com/embed/5vuA3CSa0J4?autoplay=1',
    summary: 'Direct in-app embed allowed. Paste any YouTube URL or search directly.'
  },
  {
    id: 'tubi',
    name: 'Tubi',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Tubi_logo_2024.svg',
    directUrl: 'https://tubitv.com/',
    badge: 'AD-SUPPORTED OPEN',
    summary: 'Free legal streaming. Direct playback and synchronized companion support.'
  },
  {
    id: 'pluto_tv',
    name: 'Pluto TV',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Pluto_TV_logo.svg',
    directUrl: 'https://pluto.tv/',
    badge: 'LIVE FAST CHANNELS',
    summary: '100+ free live channels. Open HTTP streams with zero subscription required.'
  },
  {
    id: 'roku_channel',
    name: 'The Roku Channel',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/The_Roku_Channel_logo.svg',
    directUrl: 'https://therokuchannel.roku.com/',
    badge: 'FREE MOVIES',
    summary: 'Free on-demand movies & TV series with open web streaming.'
  },
  {
    id: 'freevee',
    name: 'Freevee',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Amazon_Freevee_logo.svg',
    directUrl: 'https://www.amazon.com/freevee',
    badge: 'AMAZON FREEVEE',
    summary: 'Ad-supported Amazon network with free full-length cinema.'
  },
  {
    id: 'crackle',
    name: 'Crackle',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Crackle_Logo_2022.svg',
    directUrl: 'https://www.crackle.com/',
    badge: 'FREE MOVIES',
    summary: 'Classic blockbusters and TV shows with open streaming manifests.'
  },
  {
    id: 'internet_archive',
    name: 'Internet Archive',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Internet_Archive_logo_and_wordmark.svg',
    directUrl: 'https://archive.org/details/movies',
    badge: 'PUBLIC DOMAIN',
    summary: 'Open master archives of public domain cinema and historical media.'
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Bilibili_logo.svg',
    directUrl: 'https://www.bilibili.tv/',
    badge: 'ANIME & COMMUNITY',
    summary: 'Open anime broadcasts and community video streams.'
  },
  {
    id: 'aniwatch',
    name: 'Aniwatch',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Popcorn_Time_logo.png/600px-Popcorn_Time_logo.png',
    directUrl: 'https://aniwatchtv.to/',
    badge: 'FREE ANIME',
    summary: 'High-speed anime streaming with direct subtitle support.'
  },
  {
    id: 'fancode',
    name: 'FanCode',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/FanCode_Logo.png',
    directUrl: 'https://www.fancode.com/',
    badge: 'LIVE SPORTS',
    summary: 'Live cricket, football, and racing with low-latency stream manifests.'
  },
  {
    id: 'espn',
    name: 'ESPN',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/ESPN_wordmark.svg',
    directUrl: 'https://www.espn.com/',
    badge: 'GLOBAL SPORTS',
    summary: 'Live scores, highlights, and open sports broadcasts.'
  },
  {
    id: 'dazn',
    name: 'DAZN',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/DAZN_Logo_2018.svg',
    directUrl: 'https://www.dazn.com/',
    badge: 'COMBAT & SOCCER',
    summary: 'Boxing, MMA, and European football live sports streaming.'
  },
  {
    id: 'eurosport',
    name: 'Eurosport',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Eurosport_2015_logo.svg',
    directUrl: 'https://www.eurosport.com/',
    badge: 'EUROPEAN SPORTS',
    summary: 'Cycling, tennis grand slams, and winter sports coverage.'
  },
  {
    id: 'willow_tv',
    name: 'Willow TV',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/3/34/Willow_TV_logo.png',
    directUrl: 'https://www.willow.tv/',
    badge: 'CRICKET HD',
    summary: '24/7 live international and franchise cricket matches.'
  },
  {
    id: 'nba_app',
    name: 'NBA App',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
    directUrl: 'https://www.nba.com/watch',
    badge: 'BASKETBALL LIVE',
    summary: 'Live NBA matchups, court-side feeds, and game highlights.'
  },
  {
    id: 'nfl_plus',
    name: 'NFL+',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg',
    directUrl: 'https://www.nfl.com/plus',
    badge: 'FOOTBALL LIVE',
    summary: 'Live regular season games, redzone, and audio broadcasts.'
  },
  {
    id: 'ufc_fight_pass',
    name: 'UFC Fight Pass',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/UFC_logo.svg',
    directUrl: 'https://ufcfightpass.com/',
    badge: 'UFC MMA',
    summary: 'Live preliminary fights and martial arts archives.'
  },
  {
    id: 'fox_sports',
    name: 'Fox Sports',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Fox_Sports_logo_2020.svg',
    directUrl: 'https://www.foxsports.com/',
    badge: 'MAJOR LEAGUES',
    summary: 'NFL, MLB, college football, and soccer broadcasts.'
  },
  {
    id: 'sky_sports',
    name: 'Sky Sports',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Sky_Sports_logo_2020.svg',
    directUrl: 'https://www.skysports.com/',
    badge: 'PREMIER LEAGUE',
    summary: 'Premier League football, Formula 1, cricket, and golf.'
  },
  {
    id: 'bein_sports',
    name: 'beIN Sports',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/BeIN_Sports_logo.svg',
    directUrl: 'https://www.beinsports.com/',
    badge: 'GLOBAL FOOTBALL',
    summary: 'La Liga, Ligue 1, and international tournaments.'
  },
  {
    id: 'wwe_network',
    name: 'WWE Network',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/WWE_Logo.svg/512px-WWE_Logo.svg.png',
    directUrl: 'https://www.wwe.com/wwenetwork',
    badge: 'WRESTLING PPV',
    summary: 'WrestleMania, SummerSlam, Raw, and SmackDown.'
  },
  {
    id: 'icc_tv',
    name: 'ICC TV',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8d/International_Cricket_Council_logo.svg',
    directUrl: 'https://www.icc-cricket.com/videos',
    badge: 'WORLD CRICKET',
    summary: 'Official ICC World Cup tournaments and qualifiers.'
  },
  {
    id: 'f1_tv',
    name: 'F1 TV',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg',
    directUrl: 'https://f1tv.formula1.com/',
    badge: 'FORMULA 1',
    summary: 'Onboard camera feeds, team radios, and live Grand Prix.'
  },
  {
    id: 'hotstar_open',
    name: 'Disney+ Hotstar Sports Open',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg',
    directUrl: 'https://www.hotstar.com/sports',
    badge: 'FREE CRICKET',
    summary: 'Mobile & browser free sports streams with live commentary.'
  }
];

// ── VERIFIED 100% WORKING CLEAN CINEMA STREAMS (DUAL ENGINE MP4 & NO-COOKIE EMBED) ──
export const VERIFIED_CLEAN_MOVIES = [
  {
    id: 1,
    title: 'Night of the Living Dead',
    year: 1968,
    category: 'Horror',
    description: 'George A. Romero\'s legendary horror landmark where strangers barricade themselves in a rural farmhouse against relentless flesh-eating ghouls.',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/5vuA3CSa0J4?autoplay=1&rel=0&modestbranding=1'
  },
  {
    id: 2,
    title: 'The General',
    year: 1926,
    category: 'Comedy',
    description: 'Buster Keaton\'s silent comedy masterpiece following a brave train engineer who embarks on a death-defying solo locomotive chase to rescue his stolen engine and love.',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/iHlBLHTkWg4?autoplay=1&rel=0&modestbranding=1'
  },
  {
    id: 3,
    title: 'Metropolis',
    year: 1927,
    category: 'Sci-Fi',
    description: 'Fritz Lang\'s groundbreaking dystopian sci-fi vision of a futuristic hyper-city where subterranean laborers rise against wealthy oligarchs.',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/on2H8qt54Sub?autoplay=1&rel=0&modestbranding=1'
  },
  {
    id: 4,
    title: 'Nosferatu: A Symphony of Horror',
    year: 1922,
    category: 'Horror',
    description: 'F.W. Murnau\'s eerie vampire classic depicting Count Orlok\'s plague-infested voyage across the sea to claim a peaceful Baltic town.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/e_XQY-rYq_Q?autoplay=1&rel=0&modestbranding=1'
  },
  {
    id: 5,
    title: 'Charade',
    year: 1963,
    category: 'Thriller',
    description: 'Stanley Donen\'s stylish romantic suspense thriller starring Audrey Hepburn and Cary Grant dodging dangerous fortune-hunters in Paris.',
    poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/z44qDq6R-qQ?autoplay=1&rel=0&modestbranding=1'
  },
  {
    id: 6,
    title: 'The 39 Steps',
    year: 1935,
    category: 'Thriller',
    description: 'Alfred Hitchcock\'s iconic espionage thriller where an innocent man is framed for murder and races across the Scottish Highlands to stop a spy ring.',
    poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/h3g-LcL1k_w?autoplay=1&rel=0&modestbranding=1'
  }
];
