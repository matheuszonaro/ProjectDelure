export interface Game {
  id: string;
  title: string;
  publisher: string;
  coverImage: string;
  price: {
    original: number;
    current: number;
    currency: 'AUD';
    discount?: number;
    saleEnds?: string;
  };
  genre: string;
  platform: 'Switch' | 'Switch 2';
  nsuid?: string;
  releaseDate?: string;   // formatted string, e.g. "15 April 2025"
  releaseDateIso?: string; // raw ISO for locale-formatting client-side
}

export interface GameDetail extends Game {
  description?: string;
  developer?: string;
  ageRating?: string;
  playersMin?: number;
  playersMax?: number;
  hasDigital?: boolean;
  hasPhysical?: boolean;
  hasDemo?: boolean;
  hasDlc?: boolean;
  fileSize?: string;
  languages?: string;
  categories?: string[];
  series?: string;
  screenshotUrls?: string[];
  images?: { hero?: string; banner?: string; square?: string };
  eshopUrl?: string;
}

export interface PricePoint {
  date: string;   // 'YYYY-MM-DD'
  price: number;
  onSale: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;      // short preview (~200 chars)
  fullDescription: string;  // untruncated stripped content
  link: string;
  pubDate: string;
  thumbnail?: string;
  source: string;
}

export type GameTab        = 'sales' | 'new' | 'popular' | 'all' | 'coming-soon';
export type SortOption     = 'default' | 'discount' | 'price-asc' | 'price-desc' | 'name';
export type PlatformFilter = 'all' | 'switch1' | 'switch2';
