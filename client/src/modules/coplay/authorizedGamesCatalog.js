/**
 * CoGether Authorized Game Catalog
 * Production metadata architecture with explicit licensing, repository provenance, and game modes.
 * All first-class games are served 100% locally from audited repositories (no external iframes).
 */
import { GameMode, LicenseStatus, DistributionStatus, GameCategory, LaunchType } from './gameSchema.js';

export const GAME_CATEGORIES = [
  { id: GameCategory.ALL, label: 'All Games', iconName: 'Flame' },
  { id: GameCategory.PUZZLE, label: 'Puzzle & Strategy', iconName: 'Brain' },
  { id: GameCategory.RUNNERS, label: 'Runners & Action', iconName: 'Zap' },
  { id: GameCategory.LOCAL_COOP, label: 'Local 2-Player', iconName: 'Gamepad2' },
  { id: GameCategory.MULTIPLAYER, label: 'Online Squad & IO', iconName: 'Users' },
  { id: GameCategory.SPORTS, label: 'Sports & Racing', iconName: 'Trophy' }
];

export const AUTHORIZED_GAMES_DATABASE = [
  // =========================================================================
  // 1. FIRST-CLASS LOCALLY HOSTED OPEN-SOURCE GAMES (AUDITED & VERIFIED)
  // =========================================================================
  {
    id: '2048',
    title: '2048 — Open Source',
    description: 'Join the numbers to reach the 2048 tile! Authentic, self-contained open-source edition created by Gabriele Cirulli. 100% local, zero tracking, instant playback.',
    thumbnail: '/games/thumbnails/2048.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether Open Source',
    providerGameId: '2048',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Arrow Keys or WASD to slide tiles in 4 directions',
      description: 'Swipe or Arrow Keys.'
    },
    orientation: 'any',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.LICENSE_VERIFIED,
    sourceRepository: 'https://github.com/gabrielecirulli/2048',
    sourceLicense: 'MIT',
    attribution: 'Copyright (c) 2014 Gabriele Cirulli. Based on 1024 by Veewo Studio and conceptually similar to Threes by Asher Vollmer. Permitted under MIT License.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/2048/index.html'
  },
  {
    id: 'hextris',
    title: 'Hextris (Open-Source)',
    description: 'Fast-paced hexagonal puzzle game inspired by Tetris. Rotate the hexagon to match 3 or more blocks of the same color! Fully self-contained local build.',
    thumbnail: '/games/thumbnails/hextris.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether Open Source',
    providerGameId: 'hextris',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Left/Right Arrow Keys or A/D to rotate hexagon',
      description: 'Rotate the central hexagon to clear incoming colored bars.'
    },
    orientation: 'any',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.LICENSE_VERIFIED,
    sourceRepository: 'https://github.com/Hextris/hextris',
    sourceLicense: 'GPL-3.0',
    attribution: 'Copyright (C) 2018 Logan Engstrom, Garrett Finucane, Noah Moroze, Michael Yang. Licensed under GNU General Public License v3.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/hextris/index.html'
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle (Classic)',
    description: 'Clean open-source falling-blocks puzzle implementation by Jake Gordon. Pure HTML5 canvas with zero dependencies. Not affiliated with or endorsed by The Tetris Company or Nintendo.',
    thumbnail: '/games/thumbnails/block-puzzle.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether Open Source',
    providerGameId: 'block-puzzle',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Left/Right Arrow to move, Up Arrow to rotate, Down to soft drop, Space to play/drop',
      description: 'Standard keyboard arrow controls.'
    },
    orientation: 'any',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.LICENSE_VERIFIED,
    sourceRepository: 'https://github.com/jakesgordon/javascript-tetris',
    sourceLicense: 'MIT',
    attribution: 'Copyright (c) 2011-2016 Jake Gordon and contributors. Not affiliated with The Tetris Company.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/block-puzzle/index.html'
  },
  {
    id: 'clumsy-bird',
    title: 'Clumsy Bird (Open-Source)',
    description: 'Retro 8-bit arcade tap-to-fly hurdle runner powered by MelonJS. Created by Ellison Leao. Inspired by Flappy Bird. Fully local asset distribution.',
    thumbnail: '/games/thumbnails/clumsy-bird.svg',
    category: GameCategory.RUNNERS,
    provider: 'CoGether Open Source',
    providerGameId: 'clumsy-bird',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Spacebar or Left Click to flap wings and gain altitude',
      description: 'Tap or Spacebar to fly between obstacle pipes.'
    },
    orientation: 'portrait',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.LICENSE_VERIFIED,
    sourceRepository: 'https://github.com/ellisonleao/clumsy-bird',
    sourceLicense: 'GPL-3.0',
    attribution: 'Copyright (C) 2014 Ellison Leao. MelonJS engine. Licensed under GNU General Public License v3.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/clumsy-bird/index.html'
  },

  // =========================================================================
  // 2. LOCAL CO-OP (2 PLAYERS ON THE SAME DEVICE)
  // =========================================================================
  {
    id: 'retro-pong-2p',
    title: 'Retro Pong 2P Battle',
    description: 'Authentic 2-player table tennis duel on the same keyboard. Player 1 uses W/S, Player 2 uses Up/Down Arrow keys.',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.LOCAL_COOP,
    provider: 'open_source',
    providerGameId: 'retro-pong-2p',
    gameMode: GameMode.LOCAL_COOP,
    multiplayer: false,
    maxPlayers: 2,
    controls: {
      p1: 'Player 1: W (Up), S (Down)',
      p2: 'Player 2: Up Arrow (Up), Down Arrow (Down)',
      description: 'Local dual controls on one keyboard.'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: false,
    challengeSupported: false,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.AUTHORIZED,
    sourceRepository: 'https://github.com/tonylukasavage/pong',
    sourceLicense: 'MIT',
    attribution: 'Open-source local 2-player pong implementation.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: 'https://html5.gamemonetize.co/e3nqbd83zbz64dri00qtgftk6ke4reds/'
  },
  {
    id: 'tank-battle-2p',
    title: 'Tank Battle Arena 2P',
    description: 'Local 2-player armored warfare! Outmaneuver your friend in a maze of destructible walls on the same computer.',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.LOCAL_COOP,
    provider: 'distributor_html5',
    providerGameId: 'tank-battle-2p',
    gameMode: GameMode.LOCAL_COOP,
    multiplayer: false,
    maxPlayers: 2,
    controls: {
      p1: 'Player 1: WASD to Move + Spacebar to Shoot',
      p2: 'Player 2: Arrow Keys to Move + Enter / M to Shoot',
      description: 'Split keyboard bindings for head-to-head local play.'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: false,
    challengeSupported: false,
    distributionStatus: DistributionStatus.AVAILABLE,
    licenseStatus: LicenseStatus.DISTRIBUTOR_AUTHORIZED,
    sourceRepository: 'N/A',
    sourceLicense: 'Distributor Authorized',
    attribution: 'Authorized HTML5 distributor edition.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: 'https://html5.gamemonetize.co/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/'
  },

  // =========================================================================
  // 3. PENDING AUTHORIZATION (TRANSPARENTLY DISCLOSED - NO FAKE LAUNCH)
  // =========================================================================
  {
    id: 'subway-surfers',
    title: 'Subway Surfers: World Tour',
    description: 'Dodge oncoming trains, grind subway tracks, and escape the grumpy Inspector. Commercial rights verification pending.',
    thumbnail: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'sybo_games',
    providerGameId: 'sybo-subway',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Arrow Keys or WASD to jump, roll, and dash',
      description: 'Single-player runner (Challenge Mode compatible).'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Proprietary (SYBO Games)',
    sourceLicense: 'License Required',
    attribution: 'Subway Surfers is a trademark of SYBO Games. Rights verification pending.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'temple-run-2',
    title: 'Temple Run 2: Lost Jungle',
    description: 'Navigate perilous cliffs, zip lines, and ancient temple mines while escaping the Demon Monkey. Rights verification pending.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'imangi_studios',
    providerGameId: 'imangi-temple2',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Arrow Keys to turn, jump, slide, and tilt',
      description: 'Single-player endless runner.'
    },
    orientation: 'portrait',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Proprietary (Imangi Studios)',
    sourceLicense: 'License Required',
    attribution: 'Temple Run 2 is a trademark of Imangi Studios. Rights verification pending.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'smash-karts',
    title: 'Smash Karts 3D',
    description: '3D multiplayer kart battle arena with power-ups and rockets. Distribution authorization pending.',
    thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.MULTIPLAYER,
    provider: 'smashkarts_io',
    providerGameId: 'smashkarts-io',
    gameMode: GameMode.ONLINE_MULTIPLAYER,
    multiplayer: true,
    maxPlayers: 8,
    controls: {
      p1: 'WASD to drive, Spacebar to fire weapons',
      description: 'Online networked kart combat.'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: false,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Online Game',
    sourceLicense: 'License Required',
    attribution: 'Smash Karts distribution rights pending verification.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'level-devil',
    title: 'Level Devil',
    description: 'A platformer with a cruel twist where doors move, spikes fall, and paths trick you. Rights verification pending.',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.ACTION,
    provider: 'unept',
    providerGameId: 'level-devil-unept',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'A/D or Left/Right Arrow keys to move, Spacebar to jump',
      description: 'Tricky puzzle platformer.'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Proprietary (Unept)',
    sourceLicense: 'License Required',
    attribution: 'Level Devil is created by Unept. Rights verification pending.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'retro-bowl',
    title: 'Retro Bowl Championship',
    description: 'Retro 8-bit American football simulation and roster management. Rights verification pending.',
    thumbnail: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.SPORTS,
    provider: 'new_star_games',
    providerGameId: 'retro-bowl-nsg',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Mouse click and drag to pass, tap to dive',
      description: 'Gridiron football retro simulation.'
    },
    orientation: 'landscape',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Proprietary (New Star Games)',
    sourceLicense: 'License Required',
    attribution: 'Retro Bowl is a trademark of New Star Games. Rights verification pending.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'talking-tom-gold-run',
    title: 'Talking Tom: Gold Run',
    description: 'Sprint, jump, and dodge through dynamic worlds to reclaim stolen gold. Rights verification pending.',
    thumbnail: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'outfit7',
    providerGameId: 'outfit7-tom-gold',
    gameMode: GameMode.SINGLE_PLAYER,
    multiplayer: false,
    maxPlayers: 1,
    controls: {
      p1: 'Arrow keys or WASD to navigate 3 lanes',
      description: 'Single-player endless runner.'
    },
    orientation: 'portrait',
    fullscreenSupported: true,
    cameraSupported: true,
    challengeSupported: true,
    distributionStatus: DistributionStatus.UNAVAILABLE,
    licenseStatus: LicenseStatus.PENDING_REVIEW,
    sourceRepository: 'Commercial Proprietary (Outfit7)',
    sourceLicense: 'License Required',
    attribution: 'Talking Tom is a trademark of Outfit7. Rights verification pending.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  }
];
