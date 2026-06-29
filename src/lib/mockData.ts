import type { Game, NewsItem } from '../types';

// picsum.photos generates deterministic images from seeds — always available
const img = (seed: string, w = 640, h = 360) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const MOCK_GAMES: Game[] = [
  {
    id: 'mock-1', title: 'The Legend of Zelda: Tears of the Kingdom', publisher: 'Nintendo',
    coverImage: img('zelda-totk', 640, 360),
    price: { original: 99.95, current: 64.99, currency: 'AUD', discount: 35, saleEnds: new Date(Date.now() + 5 * 86400000).toISOString() },
    genre: 'Action, Adventure', platform: 'Switch',
  },
  {
    id: 'mock-2', title: 'Super Mario Bros. Wonder', publisher: 'Nintendo',
    coverImage: img('mario-wonder', 640, 360),
    price: { original: 79.95, current: 55.99, currency: 'AUD', discount: 30, saleEnds: new Date(Date.now() + 3 * 86400000).toISOString() },
    genre: 'Platformer', platform: 'Switch',
  },
  {
    id: 'mock-3', title: 'Metroid Dread', publisher: 'Nintendo',
    coverImage: img('metroid-dread', 640, 360),
    price: { original: 79.95, current: 39.99, currency: 'AUD', discount: 50 },
    genre: 'Action, Adventure', platform: 'Switch',
  },
  {
    id: 'mock-4', title: 'Pikmin 4', publisher: 'Nintendo',
    coverImage: img('pikmin4', 640, 360),
    price: { original: 79.95, current: 49.99, currency: 'AUD', discount: 37, saleEnds: new Date(Date.now() + 7 * 86400000).toISOString() },
    genre: 'Strategy', platform: 'Switch',
  },
  {
    id: 'mock-5', title: 'Fire Emblem Engage', publisher: 'Nintendo',
    coverImage: img('fire-emblem', 640, 360),
    price: { original: 99.95, current: 49.99, currency: 'AUD', discount: 50 },
    genre: 'RPG, Strategy', platform: 'Switch',
  },
  {
    id: 'mock-6', title: 'Bayonetta 3', publisher: 'PlatinumGames',
    coverImage: img('bayonetta3', 640, 360),
    price: { original: 89.95, current: 44.99, currency: 'AUD', discount: 50 },
    genre: 'Action', platform: 'Switch',
  },
  {
    id: 'mock-7', title: 'Xenoblade Chronicles 3', publisher: 'Nintendo',
    coverImage: img('xenoblade3', 640, 360),
    price: { original: 99.95, current: 69.99, currency: 'AUD', discount: 30, saleEnds: new Date(Date.now() + 2 * 86400000).toISOString() },
    genre: 'RPG', platform: 'Switch',
  },
  {
    id: 'mock-8', title: 'Kirby and the Forgotten Land', publisher: 'Nintendo',
    coverImage: img('kirby-land', 640, 360),
    price: { original: 79.95, current: 39.99, currency: 'AUD', discount: 50 },
    genre: 'Platformer', platform: 'Switch',
  },
  {
    id: 'mock-9', title: 'Splatoon 3', publisher: 'Nintendo',
    coverImage: img('splatoon3', 640, 360),
    price: { original: 79.95, current: 54.99, currency: 'AUD', discount: 31 },
    genre: 'Action, Shooter', platform: 'Switch',
  },
  {
    id: 'mock-10', title: 'Pokémon Scarlet', publisher: 'Game Freak',
    coverImage: img('pokemon-scarlet', 640, 360),
    price: { original: 79.95, current: 59.99, currency: 'AUD', discount: 25, saleEnds: new Date(Date.now() + 4 * 86400000).toISOString() },
    genre: 'RPG', platform: 'Switch',
  },
  {
    id: 'mock-11', title: 'Animal Crossing: New Horizons', publisher: 'Nintendo',
    coverImage: img('animal-crossing', 640, 360),
    price: { original: 79.95, current: 47.99, currency: 'AUD', discount: 40 },
    genre: 'Simulation', platform: 'Switch',
  },
  {
    id: 'mock-12', title: 'Mario Kart 8 Deluxe', publisher: 'Nintendo',
    coverImage: img('mario-kart8', 640, 360),
    price: { original: 79.95, current: 79.95, currency: 'AUD' },
    genre: 'Racing', platform: 'Switch',
  },
];

const NOW = new Date();

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'Nintendo Switch 2 release date confirmed with full backwards compatibility',
    description: 'Nintendo officially announces the successor to the Switch, featuring a larger OLED screen, improved Joy-Con design, and full backwards compatibility with all existing Switch titles.',
    fullDescription: 'Nintendo officially announces the successor to the Switch, featuring a larger OLED screen, improved Joy-Con design, and full backwards compatibility with all existing Switch titles. The new console launches with a redesigned dock, a new GameChat feature for voice communication, and support for a higher graphical output. All existing Switch cartridges will work out of the box.',
    link: 'https://www.nintendolife.com',
    pubDate: new Date(NOW.getTime() - 30 * 60000).toISOString(),
    thumbnail: img('nintendo-switch2', 800, 450),
    source: 'Nintendo Life',
  },
  {
    id: 'n2',
    title: 'Australia gets exclusive Nintendo eShop sale — up to 50% off top titles',
    description: 'The Nintendo eShop AU has launched a major summer sale featuring discounts on dozens of first-party and third-party titles through to the end of the month.',
    fullDescription: 'The Nintendo eShop AU has launched a major summer sale featuring discounts on dozens of first-party and third-party titles through to the end of the month. Highlights include Zelda: Tears of the Kingdom at 35% off, Super Mario Bros. Wonder at 30% off, and many third-party gems like Hollow Knight at 50% off. The sale runs until 31 December.',
    link: 'https://www.vooks.net',
    pubDate: new Date(NOW.getTime() - 2 * 3600000).toISOString(),
    thumbnail: img('eshop-sale', 800, 450),
    source: 'Vooks',
  },
  {
    id: 'n3',
    title: 'Zelda: Tears of the Kingdom wins Game of the Year at Australian Game Awards',
    description: 'The latest entry in the Legend of Zelda series takes home the top prize at the 2024 Australian Game Awards, with Nintendo dominating every category.',
    fullDescription: 'The latest entry in the Legend of Zelda series takes home the top prize at the 2024 Australian Game Awards, with Nintendo dominating every category. Tears of the Kingdom beat out Baldur\'s Gate 3 and Marvel\'s Spider-Man 2 for the top honour. Nintendo also swept Best Family Game, Best Action-Adventure, and Best Audio categories at the ceremony held in Sydney.',
    link: 'https://mynintendonews.com',
    pubDate: new Date(NOW.getTime() - 5 * 3600000).toISOString(),
    thumbnail: img('zelda-award', 800, 450),
    source: 'My Nintendo News',
  },
  {
    id: 'n4',
    title: 'New Pokémon Legends: Z-A trailer showcases redesigned Lumiose City',
    description: 'The upcoming Pokémon game set in a redesigned Kalos region reveals sweeping urban changes to the iconic Lumiose City in an action-packed new trailer.',
    fullDescription: 'The upcoming Pokémon game set in a redesigned Kalos region reveals sweeping urban changes to the iconic Lumiose City in an action-packed new trailer. The trailer confirms real-time battles in a fully 3D open environment, a new capture mechanic involving parkour, and the return of Mega Evolution. Game Freak states the title will release simultaneously worldwide.',
    link: 'https://gematsu.com',
    pubDate: new Date(NOW.getTime() - 8 * 3600000).toISOString(),
    thumbnail: img('pokemon-za', 800, 450),
    source: 'Gematsu',
  },
  {
    id: 'n5',
    title: 'Mario Kart 9 rumoured as Switch 2 launch title according to industry insiders',
    description: 'Multiple credible sources suggest a new Mario Kart entry is in development and set to launch alongside the upcoming Nintendo platform later this year.',
    fullDescription: 'Multiple credible sources suggest a new Mario Kart entry is in development and set to launch alongside the upcoming Nintendo platform later this year. The game is said to feature a fully open-world Grand Prix mode, online co-op for up to 24 players, and deeper crossover content with other Nintendo franchises. Physical and digital editions are both planned.',
    link: 'https://www.nintendolife.com',
    pubDate: new Date(NOW.getTime() - 12 * 3600000).toISOString(),
    thumbnail: img('mario-kart9', 800, 450),
    source: 'Nintendo Life',
  },
  {
    id: 'n6',
    title: 'Hollow Knight: Silksong finally gets a 2025 release window',
    description: 'Team Cherry has announced the long-awaited sequel arrives in 2025, with Nintendo Switch and Switch 2 versions both confirmed. The news sent the internet into a frenzy.',
    fullDescription: 'Team Cherry has announced the long-awaited sequel arrives in 2025, with Nintendo Switch and Switch 2 versions both confirmed. The news sent the internet into a frenzy. Silksong follows Hornet as she explores a new kingdom filled with over 150 enemies, new movement mechanics, and a fully original soundtrack. Team Cherry confirmed no further delays are planned.',
    link: 'https://www.vooks.net',
    pubDate: new Date(NOW.getTime() - 18 * 3600000).toISOString(),
    thumbnail: img('hollow-knight', 800, 450),
    source: 'Vooks',
  },
  {
    id: 'n7',
    title: 'Splatoon 3 adds massive free content update with six new maps',
    description: 'The latest seasonal update for Splatoon 3 brings six new multiplayer stages plus an arsenal of new weapons, all completely free for existing owners.',
    fullDescription: 'The latest seasonal update for Splatoon 3 brings six new multiplayer stages plus an arsenal of new weapons, all completely free for existing owners. The update also introduces ranked modes for each stage, a new battle pass with exclusive gear, and quality-of-life improvements to lobbies and matchmaking. Nintendo confirmed further updates through 2025.',
    link: 'https://mynintendonews.com',
    pubDate: new Date(NOW.getTime() - 24 * 3600000).toISOString(),
    thumbnail: img('splatoon-update', 800, 450),
    source: 'My Nintendo News',
  },
  {
    id: 'n8',
    title: 'Metroid Prime 4: Beyond showcases 20 minutes of open-world gameplay',
    description: 'Nintendo presents an extended look at the upcoming Metroid sequel confirming vast explorable environments and a deep slate of new abilities for Samus Aran.',
    fullDescription: 'Nintendo presents an extended look at the upcoming Metroid sequel confirming vast explorable environments and a deep slate of new abilities for Samus Aran. The showcase confirmed a fluid grapple system, stealth mechanics, and the return of the Phazon corruption storyline. The game is being developed by Retro Studios and is slated for a 2025 release on Switch 2.',
    link: 'https://gematsu.com',
    pubDate: new Date(NOW.getTime() - 30 * 3600000).toISOString(),
    thumbnail: img('metroid-prime4', 800, 450),
    source: 'Gematsu',
  },
];
