# Delure

Nintendo news aggregator with Australian eShop price tracker. It gathers articles from 8 international sources in real time, generates a daily AI summary, and displays prices, discounts, and price history for Switch and Switch 2 games.

---

## Index

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Running Locally](#running-locally)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [Project Structure](#project-structure)
9. [API Endpoints](#api-endpoints)
10. [News Sources](#news-sources)
11. [Environment Variables](#environment-variables)
12. [User Settings](#user-settings)

---

## Overview

Delure is a Progressive Web App (PWA) aimed at Nintendo fans. It solves two problems at once:

- **Scattered News** — Instead of opening 8 different sites, all news appears in a single chronological feed, with automatic translation.
- **AU eShop Prices** — Official Australian prices (in AUD) are hard to track. The app queries Nintendo's APIs in real time and shows discounts, history, and comparisons.

No external API keys are required. All data sources are public.

---

## Features

### News
- Aggregated feed from **8 sources** internationally via RSS/Atom
- **Infinite scroll** — automatically loads more articles as the user scrolls down
- **AI Summary** generated every 30 minutes — analyzes articles from the last 24 hours and produces 5-6 detailed paragraphs (in PT and EN) using Pollinations AI
- Opens articles in a modal with **full content** extracted directly from the source
- **Lazy-loaded images** — articles without a thumbnail in the RSS automatically fetch the `og:image` from the original page, with an animated skeleton while loading
- **Automatic translation** (Google Translate / MyMemory, no key required)
- Cards with theme colors per source, relative time badges, and fade-in animations

### Game Catalog (AU eShop)
- Tabs: **On Sale**, **New Releases**, **Popular**, **All**, **Coming Soon**
- Platform filter: Switch / Switch 2 / Both
- Sorting: discount, price ascending/descending, name
- Search with debounce
- Favorites persisted in `localStorage`
- Price history with chart (simulated via `priceHistory.ts`)

### Game Details
- Screenshot gallery, full description, metadata (age rating, players, languages, DLC, demo)
- Current price in AUD with discount badge and sale end date
- **OpenCritic Score** (score, tier, % of critics recommending)
- Related news links via Google News
- Relevant Reddit posts with score and comments

### Settings
- Toggle language PT / EN
- Manage news sources: enable/disable, add custom sources (any RSS/Atom feed), edit, and remove

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (custom design system) |
| Routing | React Router DOM 6 |
| Icons | Lucide React |
| Backend | Vercel Serverless Functions (Node.js) |
| XML/RSS | fast-xml-parser 4 |
| AI | Pollinations AI (OpenAI-compatible, free, no key) |
| Translation | Google Translate API informal + MyMemory (no key) |
| Deploy | Vercel |

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Vercel CLI** (required to run the full development mode with APIs)

```bash
npm install -g vercel
```

> To use only the frontend (without game APIs, news, and AI), `npm run dev:local` works without the Vercel CLI.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/delure.git
cd delure

# 2. Install dependencies
npm install

# 3. (Optional) Log in to Vercel
vercel login
```

---

## Running Locally

The project has two development modes:

### Quick Start Script (Windows)

For Windows users, you can use the `start.bat` script to easily boot up the frontend server and automatically open it in your browser.

```cmd
start.bat
```

### Full Mode — `vercel dev` (recommended)

Starts Vite **and** Serverless Functions together, exactly as in production.

```bash
npm run dev
```

Access at: **http://localhost:3000**

> On the first run, the Vercel CLI may ask to link the project to an account. Answer "N" (do not link) if you only want to run locally, or log in and create a new project.

### Frontend Only Mode — `vite dev`

Starts only the frontend. Calls to `/api/*` will be intercepted by the middleware in `vite.config.ts`, which emulates all production functions within the Vite process itself.

```bash
npm run dev:local
```

Access at: **http://localhost:5173**

> This mode does not require a Vercel account. It is the fastest for UI development.

### Local Production Build

```bash
npm run build       # Generates dist/
npm run preview     # Serves the build at http://localhost:4173
```

### Type Checking

```bash
npm run typecheck
```

---

## Deploy to Vercel

### Via CLI (recommended)

```bash
# Preview deploy
vercel

# Production deploy
vercel --prod
```

### Via GitHub (Automatic CI/CD)

1. Push the repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import the repository
4. Leave all default settings (Vercel automatically detects Vite)
5. Click on **Deploy**

From there, every push to `main` triggers an automatic deploy.

> There are no environment variables to configure — all used APIs are public and free.

### `vercel.json` Configuration

The `vercel.json` file in the root already contains the necessary rewrite rule for SPA routing:

```json
{
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

This ensures that routes like `/games/some-id` work correctly when accessed directly.

---

## Project Structure

```
delure/
├── api/                        # Vercel Serverless Functions
│   ├── nintendo.ts             # Catalog + eShop prices (Nintendo Europe Search + AU Price API)
│   ├── enrichment.ts           # Game enrichment (Google News RSS, Reddit, OpenCritic)
│   ├── ai-summary.ts           # AI summary of news from the last 24h
│   ├── news.ts                 # RSS Aggregator — 8 sources, paginated
│   ├── article.ts              # Extracts full content from an article (HTML → text)
│   └── thumbnail.ts            # Extracts og:image from an article URL
│
├── src/
│   ├── components/
│   │   ├── games/
│   │   │   ├── GameCard.tsx    # Game card with price and discount badge
│   │   │   └── PriceChart.tsx  # Price history chart
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx   # Main shell (sidebar + bottom nav)
│   │   │   ├── BottomNav.tsx   # Mobile navigation
│   │   │   └── Sidebar.tsx     # Desktop navigation
│   │   └── news/
│   │       ├── AISummaryCard.tsx  # AI summary card
│   │       ├── NewsCard.tsx       # News cards (featured + standard + skeleton)
│   │       └── NewsModal.tsx      # Full article modal with translation
│   │
├── contexts/
│   │   └── LangContext.tsx     # Language context (PT/EN)
│   │
├── hooks/
│   │   ├── useAISummary.ts     # Fetches and caches (30 min) the AI summary
│   │   ├── useFavorites.ts     # Favorites with localStorage
│   │   ├── useGameDetail.ts    # Details of a specific game
│   │   ├── useGameEnrichment.ts # Extra data (OpenCritic, Reddit, news)
│   │   ├── useGames.ts         # Paginated game catalog
│   │   ├── useIntersectionObserver.ts # Infinite scroll sentinel
│   │   ├── useNews.ts          # News feed with buffer and pagination
│   │   └── useSettings.ts      # Read/write settings
│   │
├── lib/
│   │   ├── api.ts              # fetchNews — primary (/api/news) + CORS proxy fallback
│   │   ├── i18n.ts             # UI Strings in PT and EN
│   │   ├── priceHistory.ts     # Price history (simulated)
│   │   ├── settings.ts         # Settings persistence in localStorage
│   │   └── translate.ts        # Automatic translation (Google Translate / MyMemory)
│   │
├── pages/
│   │   ├── HomePage.tsx        # Main news feed
│   │   ├── GamesPage.tsx       # Game catalog
│   │   ├── GameDetailPage.tsx  # Game details
│   │   ├── FavoritesPage.tsx   # Favorited games
│   │   └── SettingsPage.tsx    # App settings
│   │
├── types/
│   │   └── index.ts            # TypeScript interfaces (Game, NewsItem, etc.)
│   │
├── App.tsx                 # Main routes
├── main.tsx                # React entry point
└── index.css               # Tailwind + design system
│
├── vercel.json                 # SPA Rewrites
├── vite.config.ts              # Build config + middleware that emulates APIs in dev
├── tailwind.config.js          # Custom color palette, shadows, and animations
└── tsconfig.json
```

---

## API Endpoints

All functions are in `api/` and are automatically served by Vercel at `/api/*`.

### `GET /api/news?page=N`

Aggregates RSS/Atom from all active sources, deduplicates by URL, sorts by date, and returns an array of `NewsItem`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | RSS pagination page (WordPress `?paged=N`) |

**Cache:** `no-store` (always fresh)

---

### `GET /api/article?url=URL`

Fetches the HTML from the article URL and extracts the main content (no nav, header, footer, scripts). Tries selectors in order: `<article>`, common CMS classes (`.entry-content`, `.post-content`, etc.), `<main>`, and falls back to full page text.

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Full article URL |

**Return:** `{ text: string; image?: string }`

**Cache:** `s-maxage=3600` (1 hour per article)

---

### `GET /api/thumbnail?url=URL`

Lightweight version of `/api/article` — only reads the `<head>` of the page and returns the `og:image`.

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Full article URL |

**Return:** `{ image: string | null }`

**Cache:** `s-maxage=86400` (24 hours)

---

### `GET /api/ai-summary`

Fetches articles from the last 24 hours from all sources, generates a bilingual summary via Pollinations AI (OpenAI model), and returns it along with the list of used articles.

**Return:** `{ summary: { en: string; pt: string } | null; articles: SummaryArticle[]; generatedAt: string }`

**Cache:** `s-maxage=1800` (30 minutes)

---

### `GET /api/nintendo?type=...`

Queries the game catalog from the Nintendo Europe Search API and cross-references it with real prices from the Nintendo AU Price API.

| Parameter | Possible values | Description |
|---|---|---|
| `type` | `sales` `new` `popular` `all` `coming-soon` `search` `detail` | Listing type |
| `q` | string | Search term (used with `type=search`) |
| `limit` | number | Items per page (default: 24) |
| `offset` | number | Pagination offset |
| `platform` | `all` `switch1` `switch2` | Platform filter |
| `sort` | `default` `discount` `price-asc` `price-desc` `name` | Sorting |
| `id` | string | Game ID (used with `type=detail`) |

---

### `GET /api/enrichment?title=TITLE`

For the details page of a game. Fetches in parallel:
- **Google News RSS** — news related to the game
- **Reddit JSON API** — relevant posts from the last year
- **OpenCritic API** — score, tier, and recommendation %

**Return:** `{ news: [...]; reddit: [...]; opencritic: { score, tier, percentRecommended, url } | null }`

---

## News Sources

By default, the app aggregates the following sources:

| Source | Language | Feed |
|---|---|---|
| Nintendo Life | EN | `nintendolife.com/feeds/latest` |
| My Nintendo News | EN | `mynintendonews.com/feed/` |
| Gematsu | EN | `gematsu.com/category/nintendo/feed` |
| Vooks | EN (AU) | `vooks.net/feed/` |
| GoNintendo | EN | `gonintendo.com/feed` |
| Siliconera | EN | `siliconera.com/category/nintendo/feed/` |
| Nintendo Insider | EN (UK) | `nintendo-insider.com/feed/` |
| Nintendo Blast | PT-BR | `nintendoblast.com.br/feeds/posts/default?alt=rss` |

The user can enable/disable each source in **Settings → News Sources**, as well as add custom RSS/Atom feeds.

---

## Environment Variables

**No environment variables are required.** The project uses exclusively public and free APIs:

| Service | Usage | Authentication |
|---|---|---|
| Nintendo Europe Search | Game catalog | None |
| Nintendo AU Price API | Prices in AUD | None |
| OpenCritic API | Critic scores | None |
| Pollinations AI | AI summary | None |
| Google Translate (informal) | Automatic translation | None |
| MyMemory | Translation (fallback) | None |
| RSS/Atom feeds | News | None |

---

## User Settings

Settings are persisted in `localStorage` under the key `delure:settings`.

```typescript
interface Settings {
  lang:        'pt' | 'en';      // Interface language
  newsSources: NewsSource[];     // List of sources (active and custom)
}
```

When adding a new default source in future versions of the app, it automatically appears in Settings even for users with old saved lists — thanks to the `mergeWithDefaults()` function in `src/lib/settings.ts`.

---

## License

Private project — all rights reserved.
