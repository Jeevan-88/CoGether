/**
 * CoGether Public Domain Cinema Master Dataset
 * Compiled & curated for zero-server legal commercial-use streaming
 * All media hosted via Internet Archive (archive.org) embed framework
 * 
 * Key Schema:
 * {
 *   id: integer,
 *   title: string,
 *   year: integer,
 *   category: string,
 *   description: string,
 *   poster: string,
 *   embedUrl: string
 * }
 */

export const PUBLIC_DOMAIN_MOVIES = [
  // =========================================================================
  // 1. SCI-FI, HORROR & FANTASY MASTERPIECES (CATEGORY PRIORITY #1)
  // =========================================================================
  {
    id: 101,
    title: "Night of the Living Dead",
    year: 1968,
    category: "Horror",
    description: "A disparate group of individuals takes refuge in an abandoned farmhouse when corpses begin rising from their graves to consume the living.",
    poster: "https://archive.org/services/img/night_of_the_living_dead",
    embedUrl: "https://archive.org/embed/night_of_the_living_dead"
  },
  {
    id: 102,
    title: "Metropolis",
    year: 1927,
    category: "Sci-Fi",
    description: "In a futuristic city sharply divided between the working class and the city planners, the son of the city's mastermind falls in love with a working-class prophet.",
    poster: "https://archive.org/services/img/Metropolis_1927",
    embedUrl: "https://archive.org/embed/Metropolis_1927"
  },
  {
    id: 103,
    title: "Nosferatu: A Symphony of Horror",
    year: 1922,
    category: "Horror",
    description: "Vampire Count Orlok expresses interest in a new residence and real estate agent Hutter's wife in this pioneering silent expressionist landmark.",
    poster: "https://archive.org/services/img/Nosferatu_1922",
    embedUrl: "https://archive.org/embed/Nosferatu_1922"
  },
  {
    id: 104,
    title: "House on Haunted Hill",
    year: 1959,
    category: "Horror",
    description: "An eccentric millionaire offers $10,000 to five guests if they can survive a night locked inside his terrifying haunted mansion with sinister traps.",
    poster: "https://archive.org/services/img/house_on_haunted_hill_ipod",
    embedUrl: "https://archive.org/embed/house_on_haunted_hill_ipod"
  },
  {
    id: 105,
    title: "The Phantom of the Opera",
    year: 1925,
    category: "Horror",
    description: "A deformed phantom who haunts the Paris Opera House takes a young soprano under his wing, terrorizing all who stand in her path.",
    poster: "https://archive.org/services/img/Phantom_of_the_Opera_1925",
    embedUrl: "https://archive.org/embed/Phantom_of_the_Opera_1925"
  },
  {
    id: 106,
    title: "The Cabinet of Dr. Caligari",
    year: 1920,
    category: "Horror",
    description: "A mad hypnotist uses a sleepwalker to commit grisly murders in a small town, featuring iconic angular sets and German expressionist dread.",
    poster: "https://archive.org/services/img/TheCabinetOfDrCaligari1920",
    embedUrl: "https://archive.org/embed/TheCabinetOfDrCaligari1920"
  },
  {
    id: 107,
    title: "Carnival of Souls",
    year: 1962,
    category: "Thriller",
    description: "After a traumatic car accident, a church organist finds herself drawn to a mysterious abandoned pavilion populated by ghostly specters.",
    poster: "https://archive.org/services/img/Carnival_of_Souls_1962",
    embedUrl: "https://archive.org/embed/Carnival_of_Souls_1962"
  },
  {
    id: 108,
    title: "Plan 9 from Outer Space",
    year: 1957,
    category: "Sci-Fi",
    description: "Extraterrestrials enact a plan to resurrect Earth's dead to prevent humanity from creating a universe-destroying doomsday weapon.",
    poster: "https://archive.org/services/img/Plan_9_from_Outer_Space_1959",
    embedUrl: "https://archive.org/embed/Plan_9_from_Outer_Space_1959"
  },
  {
    id: 109,
    title: "A Trip to the Moon (Le Voyage dans la Lune)",
    year: 1902,
    category: "Sci-Fi",
    description: "A group of intrepid astronomers travel to the Moon in a cannon-propelled capsule, encountering celestial wonders and subterranean lunar inhabitants.",
    poster: "https://archive.org/services/img/LeVoyageDansLaLune_1902",
    embedUrl: "https://archive.org/embed/LeVoyageDansLaLune_1902"
  },

  // =========================================================================
  // 2. THRILLER, FILM NOIR & HITCHCOCK CLASSICS
  // =========================================================================
  {
    id: 201,
    title: "Charade",
    year: 1963,
    category: "Thriller",
    description: "A woman in Paris is pursued by several men who want a fortune stolen by her murdered husband, with only a charming stranger offering assistance.",
    poster: "https://archive.org/services/img/Charade_1963_",
    embedUrl: "https://archive.org/embed/Charade_1963_"
  },
  {
    id: 202,
    title: "The 39 Steps",
    year: 1935,
    category: "Thriller",
    description: "Alfred Hitchcock's masterpiece where an innocent civilian becomes entangled in a high-stakes counter-espionage conspiracy across Scotland.",
    poster: "https://archive.org/services/img/The_39_Steps_1935",
    embedUrl: "https://archive.org/embed/The_39_Steps_1935"
  },
  {
    id: 203,
    title: "The Stranger",
    year: 1946,
    category: "Noir",
    description: "An investigator from the War Crimes Commission tracks a high-ranking Nazi mastermind living under an alias in a sleepy Connecticut town.",
    poster: "https://archive.org/services/img/TheStranger1946",
    embedUrl: "https://archive.org/embed/TheStranger1946"
  },
  {
    id: 204,
    title: "Scarlet Street",
    year: 1945,
    category: "Noir",
    description: "A mild-mannered cashier and aspiring painter is manipulated by a ruthless femme fatale and her boyfriend, spiraling into deception and murder.",
    poster: "https://archive.org/services/img/Scarlet_Street_1945",
    embedUrl: "https://archive.org/embed/Scarlet_Street_1945"
  },
  {
    id: 205,
    title: "Detour",
    year: 1945,
    category: "Noir",
    description: "A down-on-his-luck nightclub pianist hitchhikes to California, only to be dragged into a nightmare of accidental death and blackmail.",
    poster: "https://archive.org/services/img/Detour_1945",
    embedUrl: "https://archive.org/embed/Detour_1945"
  },
  {
    id: 206,
    title: "D.O.A.",
    year: 1949,
    category: "Noir",
    description: "A man discovers he has been secretly poisoned with a slow-acting, fatal toxin and races against the clock to uncover his own murderer.",
    poster: "https://archive.org/services/img/D.o.a.",
    embedUrl: "https://archive.org/embed/D.o.a."
  },
  {
    id: 207,
    title: "M",
    year: 1931,
    category: "Thriller",
    description: "When the police in a German city are unable to catch a child-murderer, other criminals join in the manhunt in Fritz Lang's towering psychological thriller.",
    poster: "https://archive.org/services/img/M_1931",
    embedUrl: "https://archive.org/embed/M_1931"
  },

  // =========================================================================
  // 3. COMEDY & SLAPSTICK MASTERPIECES (BUSTER KEATON & CHAPLIN)
  // =========================================================================
  {
    id: 301,
    title: "The General",
    year: 1926,
    category: "Comedy",
    description: "During the American Civil War, a Southern locomotive engineer embarks on a death-defying solo pursuit to reclaim his stolen train and rescue his sweetheart.",
    poster: "https://archive.org/services/img/The_General_1926",
    embedUrl: "https://archive.org/embed/The_General_1926"
  },
  {
    id: 302,
    title: "The Kid",
    year: 1921,
    category: "Comedy",
    description: "The Tramp finds an abandoned infant in an alley and raises him with unconditional devotion, forming an unbreakable, hilarious partnership.",
    poster: "https://archive.org/services/img/TheKid1921_201602",
    embedUrl: "https://archive.org/embed/TheKid1921_201602"
  },
  {
    id: 303,
    title: "Steamboat Bill, Jr.",
    year: 1928,
    category: "Comedy",
    description: "The effete son of a rugged riverboat captain attempts to prove his worth, culminating in Buster Keaton's legendary cyclone stunt sequence.",
    poster: "https://archive.org/services/img/SteamboatBillJr",
    embedUrl: "https://archive.org/embed/SteamboatBillJr"
  },
  {
    id: 304,
    title: "His Girl Friday",
    year: 1940,
    category: "Comedy",
    description: "A hard-charging newspaper editor uses every trick in the book to keep his top reporter ex-wife from remarrying while covering a sensational murder trial.",
    poster: "https://archive.org/services/img/HisGirlFriday1940",
    embedUrl: "https://archive.org/embed/HisGirlFriday1940"
  },

  // =========================================================================
  // 4. ANIMATION & VINTAGE ADVENTURE
  // =========================================================================
  {
    id: 401,
    title: "Gulliver's Travels",
    year: 1939,
    category: "Adventure",
    description: "Fleischer Studios' animated masterwork following Lemuel Gulliver shipwrecked on the island kingdom of Lilliput amidst war and royal romance.",
    poster: "https://archive.org/services/img/Gullivers_Travels_1939",
    embedUrl: "https://archive.org/embed/Gullivers_Travels_1939"
  }
];

export const PUBLIC_DOMAIN_CATEGORIES = [
  { id: "all", label: "ALL PUBLIC DOMAIN (21)" },
  { id: "Horror", label: "HORROR & SUPERNATURAL" },
  { id: "Sci-Fi", label: "FOUNDATIONAL SCI-FI" },
  { id: "Thriller", label: "HITCHCOCK & THRILLERS" },
  { id: "Noir", label: "ICONIC FILM NOIR" },
  { id: "Comedy", label: "KEATON & CHAPLIN COMEDY" },
  { id: "Adventure", label: "CLASSIC ADVENTURE" }
];
