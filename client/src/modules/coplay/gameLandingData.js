/**
 * CoPlay Game Landing Data
 * Minimal, natural, human-written content.
 * 4 Cinematic Landscape Scenes + Simple Apple-Style About & Features.
 */

export const GAME_LANDING_DATA = {
  '2048': {
    id: '2048',
    title: '2048',
    subtitle: 'Slide, merge, and reach the 2048 tile.',
    scenes: [
      { image: '/games/assets/2048-img1.jpg' },
      { image: '/games/assets/2048-img2.jpg' },
      { image: '/games/assets/2048-img3.jpg' },
      { image: '/games/assets/2048-img4.jpg' }
    ],
    about: {
      title: 'About 2048',
      desc1: '2048 is a classic sliding tile puzzle played on a 4x4 grid. When two tiles with the same number touch, they merge into one with double the value.',
      desc2: 'Plan your moves carefully to keep the board open, build momentum, and reach the elusive 2048 tile.',
      image: '/games/assets/2048-img2.jpg'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Swipe to Slide',
        desc: 'Use Arrow keys, WASD, or swipe gestures to slide all tiles across the grid simultaneously.'
      },
      {
        step: '02',
        title: 'Merge Equal Numbers',
        desc: 'When two tiles of the same value collide, they combine into their sum (2+2=4, 4+4=8, up to 2048).'
      },
      {
        step: '03',
        title: 'Keep Corners Locked',
        desc: 'Every valid move spawns a new tile. Anchor your highest number in a corner to avoid gridlock.'
      }
    ],
    features: [
      {
        title: 'Split-Screen Duel',
        desc: 'Race friends live with synchronized split-screen board streaming over low-latency WebRTC.'
      },
      {
        title: 'Zero Latency',
        desc: 'Hardware-accelerated animations run at 120 FPS with instant keyboard and touch response.'
      },
      {
        title: 'Voice & Party Chat',
        desc: 'Talk with friends and celebrate high scores together with built-in voice and video.'
      }
    ],
    modes: [
      { name: 'Solo Classic', desc: 'Take your time, calculate moves, and strive for 2048.' },
      { name: 'Race Duel', desc: 'Compete head-to-head. First to reach 2048 or highest score wins.' },
      { name: 'Party Battle', desc: 'Up to 3 players racing simultaneously with live board projection.' }
    ],
    ctaHeadline: 'Ready to Play 2048?',
    ctaSubtext: 'Launch the game solo or invite friends to a live race on CoPlay.',
    isPlayable: true
  },

  'block': {
    id: 'block',
    title: 'Block Puzzle',
    subtitle: 'Rotate, place, and clear horizontal rows.',
    scenes: [
      { image: '/games/assets/block-puzzle-img1.jpg' },
      { image: '/games/assets/block-puzzle-img2.jpg' },
      { image: '/games/assets/block-puzzle-img3.jpg' },
      { image: '/games/assets/block-puzzle-img4.jpg' }
    ],
    about: {
      title: 'About Block Puzzle',
      desc1: 'Block Puzzle challenges your spatial awareness and reflexes. Falling geometric shapes descend steadily into a 10-column playing field.',
      desc2: 'Rotate and slot interlocking pieces into unbroken horizontal lines to clear rows and keep the chamber from overflowing.',
      image: '/games/assets/block-puzzle-img1.jpg'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Position & Rotate',
        desc: 'Move shapes horizontally with Arrow keys and press Up or W to rotate 90 degrees.'
      },
      {
        step: '02',
        title: 'Clear Full Lines',
        desc: 'Fill complete horizontal rows across the grid to eliminate them and score bonus points.'
      },
      {
        step: '03',
        title: 'Manage the Speed',
        desc: 'As your score increases, the pieces descend faster. Stay ahead of the stack.'
      }
    ],
    features: [
      {
        title: 'Pure Canvas Precision',
        desc: 'Responsive 60 FPS canvas engine with accurate wall-kicks and ghost piece preview.'
      },
      {
        title: 'Tactile Sound & Haptics',
        desc: 'Crisp mechanical sound effects for every lock, slide, and line demolition.'
      },
      {
        title: 'Party Room Duels',
        desc: 'Compete in head-to-head party sessions with shared video overlays and live reactions.'
      }
    ],
    modes: [
      { name: 'Marathon', desc: 'Survive as long as possible as gravitational speed accelerates.' },
      { name: 'Sprint 40', desc: 'Clear 40 lines in the absolute shortest time possible.' },
      { name: 'Duo Duel', desc: 'Send garbage lines to your opponent when clearing double and triple combos.' }
    ],
    ctaHeadline: 'Ready to Play Block Puzzle?',
    ctaSubtext: 'Launch the game right now or challenge friends to an arcade race.',
    isPlayable: true
  },

  'ttt': {
    id: 'ttt',
    title: 'Tic Tac Duel',
    subtitle: 'Three in a row. Fast rounds, instant rematches.',
    scenes: [
      { image: '/games/assets/ttt-img1.jpg' },
      { image: '/games/assets/ttt-img2.jpg' },
      { image: '/games/assets/ttt-img3.jpg' },
      { image: '/games/assets/ttt-img4.jpg' }
    ],
    about: {
      title: 'About Tic Tac Duel',
      desc1: 'Tic Tac Duel turns the timeless three-in-a-row game into a rapid-fire tactical confrontation.',
      desc2: 'Play live against friends in quick 1v1 duels or test your strategy against an adaptive minimax bot.',
      image: '/games/assets/ttt-img1.jpg'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Pick Your Move',
        desc: 'Click any empty cell in the 3x3 grid to place your mark (Red X or Yellow O).'
      },
      {
        step: '02',
        title: 'Form a Triple',
        desc: 'Connect three matching symbols horizontally, vertically, or diagonally to win the round.'
      },
      {
        step: '03',
        title: 'Instant Rematch',
        desc: 'Rounds finish in seconds. Reset the board immediately to settle fierce rivalries.'
      }
    ],
    features: [
      {
        title: 'Live 1v1 Sync',
        desc: 'Play against anyone in your party room with instant turn updates.'
      },
      {
        title: 'Minimax AI Opponent',
        desc: 'Practice solo against an adaptive bot that never makes easy mistakes.'
      },
      {
        title: 'Party Voice Dock',
        desc: 'Celebrate match-winning diagonals live with connected voice chat.'
      }
    ],
    modes: [
      { name: '1 vs AI', desc: 'Sharpen your tactics against an unflinching minimax algorithm.' },
      { name: '1 vs 1 Friend Match', desc: 'Challenge a friend in your party room with instant turn synchronization.' },
      { name: 'Tournament', desc: 'Race to five round victories to decide the undisputed arena champion.' }
    ],
    ctaHeadline: 'Ready for a Duel?',
    ctaSubtext: 'Claim your mark and challenge a friend or the AI now.',
    isPlayable: true
  },

  'bird': {
    id: 'bird',
    title: 'Clumsy Bird',
    subtitle: 'Tap to flap and thread the gaps.',
    scenes: [
      { image: '/games/assets/clumsy-bird-img1.jpg' },
      { image: '/games/assets/clumsy-bird-img2.jpg' },
      { image: '/games/assets/clumsy-bird-img3.jpg' },
      { image: '/games/assets/clumsy-bird-img4.jpg' }
    ],
    about: {
      title: 'About Clumsy Bird',
      desc1: 'Clumsy Bird tests your rhythm and reaction speed. Tap to maintain flight elevation against continuous gravity.',
      desc2: 'Navigate through narrow vertical conduit openings without touching the obstacles to rack up high scores.',
      image: '/games/assets/clumsy-bird-img1.jpg'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Tap to Flap',
        desc: 'Press the Spacebar or tap the screen to give your bird upward lift.'
      },
      {
        step: '02',
        title: 'Thread Openings',
        desc: 'Guide your bird through the gaps between vertical pillars without touching them.'
      },
      {
        step: '03',
        title: 'Beat the Record',
        desc: 'Every cleared obstacle adds one point. Find your rhythm to set new high scores.'
      }
    ],
    features: [
      {
        title: 'Authentic 8-Bit Physics',
        desc: 'Tight collision tolerances and classic arcade gravity kinematics.'
      },
      {
        title: 'Score Leaderboard',
        desc: 'Track personal bests and challenge friends to beat your streak.'
      },
      {
        title: 'Party Spectating',
        desc: 'Stream your flight runs live to connected friends in the CoGether party dock.'
      }
    ],
    modes: [
      { name: 'Standard Arcade', desc: 'The pure classic experience. One life, infinite course.' },
      { name: 'Party Pass-the-Pad', desc: 'Take turns with party friends to see who can set the highest flight record.' }
    ],
    ctaHeadline: 'Ready to Fly?',
    ctaSubtext: 'Launch Clumsy Bird now and see how far you can soar.',
    isPlayable: true
  },

  'afterhours': {
    id: 'afterhours',
    title: 'Afterhours',
    subtitle: 'Realistic 3D Endless Runner & Metropolitan Escape.',
    scenes: [
      { image: '/games/assets/afterhours-img1.jpg' },
      { image: '/games/assets/afterhours-img2.jpg' },
      { image: '/games/assets/afterhours-img3.jpg' },
      { image: '/games/assets/afterhours-img4.jpg' }
    ],
    about: {
      title: 'About Afterhours',
      desc1: 'Afterhours is an original realistic 3D runner and escape game set across a sprawling metropolitan landscape. Take control of Kai as you sprint down a 3-lane metropolitan avenue packed with moving traffic, weaving between sedans, city transit buses, and high-clearance cargo trucks.',
      desc2: 'Follow overhead highway gantry signs to choose your escape trajectory: continue straight along the avenue, branch off into the 3-track railway zone against oncoming trains, or drop into the gritty subterranean subway maze.',
      image: '/games/assets/afterhours-img1.jpg'
    },
    howToPlay: [
      {
        step: '01',
        title: '3-Lane Agility',
        desc: 'Press A / D or Left / Right arrow keys (or swipe horizontally) to swiftly shift between lanes and evade obstacles.'
      },
      {
        step: '02',
        title: 'Jump & Slide Mechanics',
        desc: 'Press W / Up / Space to vault over low barriers and hoods. Press S / Down to slide underneath high truck trailers and gantry signs.'
      },
      {
        step: '03',
        title: 'Branching Escape Routes',
        desc: 'Choose your path at major junctions: Downtown Avenues, Railway Tracks, or Subway Tunnels in a 40-minute survival journey.'
      }
    ],
    features: [
      {
        title: 'Realistic 3D Engine',
        desc: 'WebGL 3D graphics with PBR street surfaces, dynamic lighting, real-time shadow projection, and speed blur.'
      },
      {
        title: 'Dynamic Traffic & Obstacles',
        desc: 'Procedural traffic featuring sedans, city buses, container trucks with slide-under clearance, and high-speed trains.'
      },
      {
        title: 'Branching Multi-Zone Escapes',
        desc: 'Transition smoothly between 3-lane metropolitan roads, triple railway tracks with catenaries, and subterranean metro mazes.'
      }
    ],
    modes: [
      { name: 'Metropolitan Escape (Solo)', desc: 'Test your reflexes in an accelerating high-speed escape across branching city sectors.' },
      { name: 'Party Distance Duel', desc: 'Compete live with friends in CoGether voice rooms to see who survives the furthest into the night.' }
    ],
    ctaHeadline: 'Ready to Escape Afterhours?',
    ctaSubtext: 'Hit the streets with Kai and see how far you can run before the city catches up.',
    isPlayable: true
  },

  'skydash': {
    id: 'skydash',
    title: 'SkyDash',
    subtitle: 'High-speed 3D cyber endless runner across 3 neon lanes.',
    scenes: [
      { image: '/games/assets/skydash-img1.webp' },
      { image: '/games/assets/skydash-img2.webp' },
      { image: '/games/assets/skydash-img3.webp' },
      { image: '/games/assets/skydash-img4.webp' }
    ],
    about: {
      title: 'About SkyDash',
      desc1: 'SkyDash is an original fast-paced 3D-perspective endless runner built for pure browser performance. Sprint across three neon lanes suspended high above a futuristic cyber city.',
      desc2: 'Leap over low barricades, slide beneath high laser gates, switch lanes in split-second reactions, and collect energy credits to trigger shields and magnets.',
      image: '/games/assets/skydash-img1.webp'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Switch Lanes',
        desc: 'Press A / D or Left / Right arrow keys (or swipe left/right on touch) to dodge incoming barriers.'
      },
      {
        step: '02',
        title: 'Jump & Slide',
        desc: 'Press W / Up / Space to jump over hurdles. Press S / Down to slide under laser beams.'
      },
      {
        step: '03',
        title: 'Harness Power-Ups',
        desc: 'Grab Magnets, Energy Shields, Turbo Boosters, and 2X Multipliers to extend your survival distance.'
      }
    ],
    features: [
      {
        title: '3D Canvas Perspective',
        desc: 'Dynamic vanishing-point 3D road rendering with responsive physics and scaling ground shadows.'
      },
      {
        title: '4 Power-Up Systems',
        desc: 'Collect coin magnets, protective shields, invulnerable turbo sprints, and score doublers.'
      },
      {
        title: 'Synthesized Web Audio',
        desc: 'Original 8-bit sound engine with synthesized jumps, slides, coin chimes, and crash impacts.'
      }
    ],
    modes: [
      { name: 'Endless Run', desc: 'Accelerating speed runs with persistent local high-score tracking.' },
      { name: 'Party Score Duel', desc: 'Challenge friends in CoGether voice rooms to beat your record distance.' }
    ],
    ctaHeadline: 'Ready to Dash?',
    ctaSubtext: 'Sprint across the neon skyline and set a new personal distance record.',
    isPlayable: true
  },

  'mythlings': {
    id: 'mythlings',
    title: 'Mythlings',
    subtitle: 'Original pixel-art creature-collecting RPG in Sunstone Grove.',
    scenes: [
      { image: '/games/assets/mythlings-img1.webp' },
      { image: '/games/assets/mythlings-img2.webp' },
      { image: '/games/assets/mythlings-img3.webp' },
      { image: '/games/assets/mythlings-img4.webp' }
    ],
    about: {
      title: 'About Mythlings',
      desc1: 'Mythlings is a retro pixel-art creature RPG inspired by classic handheld adventures. Explore the quaint village of Oakhaven and step through the ancient stone gate into Sunstone Grove.',
      desc2: 'Encounter wild elemental creatures in tall waving grass, engage in strategic turn-based battles, throw Sunstone Orbs to recruit companions, and level up your squad.',
      image: '/games/assets/mythlings-img1.webp'
    },
    howToPlay: [
      {
        step: '01',
        title: 'Explore & Talk',
        desc: 'Move with WASD or Arrow keys. Press [E] or Space to talk with Elder Rowan and Scout Lyra.'
      },
      {
        step: '02',
        title: 'Elemental Combat',
        desc: 'Flame scorches Flora. Flora absorbs Tide. Tide douses Flame. Exploit type advantages in turn-based duels.'
      },
      {
        step: '03',
        title: 'Capture & Save',
        desc: 'Weaken wild creatures in battle, then throw Sunstone Orbs from your bag. Your journey autosaves to local storage.'
      }
    ],
    features: [
      {
        title: 'Original Creature Roster',
        desc: 'Battle, train, and bond with Ignifox, Tideling, and Bramblebud, each with 3 distinct moves.'
      },
      {
        title: 'Turn-Based Battle Engine',
        desc: 'Elemental damage calculations, visual attack FX, HP meters, EXP progression, and capture mechanics.'
      },
      {
        title: 'Chiptune Sound Engine',
        desc: 'Polyphonic 8-bit synthesized overworld melodies, energetic battle music, and retro sound effects.'
      }
    ],
    modes: [
      { name: 'Grove Adventure', desc: 'Explore the map, catch all 3 Mythlings, level up, and complete the trial.' },
      { name: 'Party Co-Op', desc: 'Show off your creature team and share battle strategies in CoGether voice chat.' }
    ],
    ctaHeadline: 'Enter Sunstone Grove',
    ctaSubtext: 'Choose your starter companion and embark on your pixel-art adventure.',
    isPlayable: true
  }
};

export const getGameLandingData = (gameId) => {
  if (GAME_LANDING_DATA[gameId]) {
    return GAME_LANDING_DATA[gameId];
  }
  const base = GAME_LANDING_DATA['2048'];
  return {
    ...base,
    id: gameId,
    title: gameId.toUpperCase(),
    subtitle: 'Classic arcade gaming on CoPlay.'
  };
};
