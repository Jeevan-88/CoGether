/**
 * CoGether Authorized Game Catalog
 * Production metadata architecture with explicit licensing, repository provenance, and game modes.
 * All first-class games are served 100% locally from audited repositories (no external iframes).
 */
import { GameMode, LicenseStatus, DistributionStatus, GameCategory, LaunchType } from './gameSchema.js';

export const GAME_CATEGORIES = [
  { id: GameCategory.ALL, label: 'All Games', iconName: 'Flame' },
  { id: 'popular', label: 'Popular', iconName: 'Sparkles' },
  { id: GameCategory.LOCAL_COOP, label: '2 Players', iconName: 'Gamepad2' },
  { id: GameCategory.PUZZLE, label: 'Puzzles', iconName: 'Brain' },
  { id: GameCategory.RUNNERS, label: 'Action & Runners', iconName: 'Zap' },
  { id: GameCategory.MULTIPLAYER, label: 'Squad & IO', iconName: 'Users' },
  { id: GameCategory.SPORTS, label: 'Sports & Racing', iconName: 'Trophy' }
];

export const AUTHORIZED_GAMES_DATABASE = [
  // =========================================================================
  // 1. FIRST-CLASS LOCALLY HOSTED OPEN-SOURCE GAMES
  // =========================================================================
  {
    id: '2048',
    title: '2048',
    description: 'Slide and merge numbered tiles on a 4x4 grid to reach the 2048 tile. Fast, lightweight, and addictive.',
    thumbnail: '/games/thumbnails/2048.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether',
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
    attribution: 'Created by Gabriele Cirulli. Based on 1024 by Veewo Studio.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/2048/index.html'
  },
  {
    id: 'hextris',
    title: 'Hextris',
    description: 'Fast-paced hexagonal puzzle game. Rotate the central hexagon to match 3 or more blocks of the same color!',
    thumbnail: '/games/thumbnails/hextris.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether',
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
    attribution: 'Created by Logan Engstrom, Garrett Finucane, Noah Moroze, Michael Yang.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/hextris/index.html'
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle',
    description: 'Classic falling-blocks puzzle game. Position and rotate blocks to clear full horizontal lines and rack up points.',
    thumbnail: '/games/thumbnails/block-puzzle.svg',
    category: GameCategory.PUZZLE,
    provider: 'CoGether',
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
    attribution: 'Created by Jake Gordon and contributors.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/block-puzzle/index.html'
  },
  {
    id: 'clumsy-bird',
    title: 'Clumsy Bird',
    description: 'Retro 8-bit tap-to-fly arcade runner. Flap your wings, navigate between pipes, and set the high score!',
    thumbnail: '/games/thumbnails/clumsy-bird.svg',
    category: GameCategory.RUNNERS,
    provider: 'CoGether',
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
    attribution: 'Created by Ellison Leao. Powered by MelonJS.',
    launchType: LaunchType.LOCAL_SOURCE,
    launchUrl: '/games/clumsy-bird/index.html'
  },

  // =========================================================================
  // 2. LOCAL CO-OP (2 PLAYERS ON THE SAME DEVICE)
  // =========================================================================
  {
    id: 'retro-pong-2p',
    title: 'Retro Pong',
    description: 'Head-to-head 2-player arcade table tennis duel on the same keyboard. Player 1 uses W/S, Player 2 uses Up/Down Arrow keys.',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.LOCAL_COOP,
    provider: 'CoGether',
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
    title: 'Tank Battle Arena',
    description: 'Local 2-player armored warfare! Outmaneuver your friend in a maze of destructible walls on the same keyboard.',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.LOCAL_COOP,
    provider: 'CoGether',
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
    sourceLicense: 'Authorized Edition',
    attribution: 'CoGether 2-Player Edition.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: 'https://html5.gamemonetize.co/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/'
  },

  // =========================================================================
  // 3. COMING SOON TO CO-PLAY
  // =========================================================================
  {
    id: 'subway-surfers',
    title: 'Subway Surfers',
    description: 'Dodge oncoming trains, grind subway tracks, and escape the grumpy Inspector. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'SYBO Games',
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
    sourceRepository: 'SYBO Games',
    sourceLicense: 'Proprietary',
    attribution: 'Subway Surfers is a trademark of SYBO Games.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'temple-run-2',
    title: 'Temple Run 2',
    description: 'Navigate perilous cliffs, zip lines, and ancient temple mines while escaping the Demon Monkey. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'Imangi Studios',
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
    sourceRepository: 'Imangi Studios',
    sourceLicense: 'Proprietary',
    attribution: 'Temple Run 2 is a trademark of Imangi Studios.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'smash-karts',
    title: 'Smash Karts',
    description: '3D multiplayer kart battle arena with power-ups, rockets, and fast-paced combat. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.MULTIPLAYER,
    provider: 'Smash Karts',
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
    sourceRepository: 'Online Multiplayer',
    sourceLicense: 'Proprietary',
    attribution: 'Smash Karts.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'level-devil',
    title: 'Level Devil',
    description: 'A platformer with a cruel twist where doors move, spikes fall, and paths trick you. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.ACTION,
    provider: 'Unept',
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
    sourceRepository: 'Unept',
    sourceLicense: 'Proprietary',
    attribution: 'Level Devil is created by Unept.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'retro-bowl',
    title: 'Retro Bowl',
    description: 'Retro 8-bit American football simulation, playbook calls, and roster management. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.SPORTS,
    provider: 'New Star Games',
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
    sourceRepository: 'New Star Games',
    sourceLicense: 'Proprietary',
    attribution: 'Retro Bowl is a trademark of New Star Games.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  },
  {
    id: 'talking-tom-gold-run',
    title: 'Talking Tom',
    description: 'Sprint, jump, and dodge through dynamic worlds to collect gold. Coming soon to Co-Play!',
    thumbnail: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80',
    category: GameCategory.RUNNERS,
    provider: 'Outfit7',
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
    sourceRepository: 'Outfit7',
    sourceLicense: 'Proprietary',
    attribution: 'Talking Tom is a trademark of Outfit7.',
    launchType: LaunchType.DIRECT_EMBED,
    launchUrl: null
  }
];
