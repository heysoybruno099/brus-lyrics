# Bru's Lyrics

A high-performance monorepo for synchronized, syllable-level lyrics across Spotify, YouTube Music, web clients, and custom playback environments. Built on open standards with full compatibility for Apple Music TTML specifications, local hardware-accelerated DOM rendering, and automated community ingestion.

---

## Architecture Overview

This monorepo utilizes npm/pnpm workspaces with strict directory boundaries:

```
brus-lyrics/
├── database/                   # Verified catalog and drop inbox
│   ├── catalog.json            # Indexed database of verified lyrics metadata
│   ├── inbox/                  # Zero-code ingestion folder for new .ttml files
│   ├── migrations/             # SQL migration files for Cloudflare D1
│   └── ttml/                   # Verified .ttml files named by ID
├── packages/
│   ├── shared-types/           # Strict TypeScript contracts (TTMLDocument, TrackMetadata, etc.)
│   ├── ttml-engine/            # 60fps zero-dependency parser, validator, and DOM renderer
│   ├── api-worker/             # Cloudflare Worker + D1 backend with string normalization & fallback
│   ├── spicetify-extension/    # Spotify Desktop extension with native playbar injection & blurred backdrop
│   ├── ytm-extension/          # YouTube Music Manifest V3 side-panel extension
│   └── sync-studio/            # Interactive Vite + React syllable synchronization studio
├── scripts/                    # Automation scripts (ingest, deployment, installation)
└── .github/workflows/          # Continuous integration and catalog automation
```

---

## Package Summary

| Package | Purpose | Technology |
| :--- | :--- | :--- |
| `@brus-lyrics/shared-types` | Shared interfaces, normalization utilities, and timestamp parsers | TypeScript |
| `@brus-lyrics/ttml-engine` | XML/LRC parser, TTML validator, and 60fps spring-scroll DOM renderer | TypeScript, CSS Custom Properties |
| `@brus-lyrics/api-worker` | REST API with Cloudflare D1 SQLite, string matching, and LRCLIB fallback | TypeScript, Hono, Wrangler |
| `@brus-lyrics/spicetify-extension` | Full-window Spotify Desktop overlay with dynamic album blur backdrop | TypeScript, Spicetify API, esbuild |
| `@brus-lyrics/ytm-extension` | Browser extension for YouTube Music (Chrome/Brave/Edge) | TypeScript, Manifest V3, Webpack/esbuild |
| `@brus-lyrics/sync-studio` | Tap-to-sync workstation with live preview and AI syllable estimation | React, Vite, Web Audio API |

---

## Core Capabilities

### 1. Apple Music TTML Specification Compliance
- Syllable-level timing tags (`<span begin="..." end="...">`) with sub-millisecond precision.
- Dual-vocalist support via `ttm:agent="v1|v2"` with directional layout positioning.
- Background vocal and ad-lib handling via `ttm:role="x-bg"` sub-line extraction.
- Automatic LRC-to-TTML synthesis for legacy line-synced sources.

### 2. Multi-Tier Provider Waterfall
When lyrics are requested, clients resolve content through a resilient waterfall:
1. **Bru's Lyrics Verified**: Exact ID match or normalized title/artist string match within `ABS(duration_ms - duration) <= 2500` against verified Cloudflare D1 catalog.
2. **Spotify / Musixmatch Native**: Integrated Color Lyrics extraction via Spotify's internal client pipeline (`Spicetify.CosmosAsync`), converting rich sync data into animated TTML.
3. **LRCLIB Direct Fallback**: Normalized fuzzy matching via LRCLIB REST API for unindexed tracks.

### 3. Hardware-Accelerated 60FPS DOM Renderer
- Driven by a decoupled `requestAnimationFrame` loop synced to external playback clocks.
- Word-level progress calculation `(currentTime - span.begin) / (span.end - span.begin)` updating `--word-progress` CSS custom properties.
- Dynamic spring physics for smooth vertical centering without layout thrashing.
- Background blur with contrast-preserving radial vignettes and dominant color extraction.

### 4. Zero-Code Ingestion Automation
- Drop any `.ttml` file into `/database/inbox/`.
- Run `npm run ingest` (or commit to GitHub).
- The pipeline validates XML integrity, extracts iTunes metadata tags, moves the file into `/database/ttml/{id}.ttml`, updates `database/catalog.json`, and generates SQL insert statements for D1.

---

## Getting Started

### Prerequisites
- Node.js 20.0.0 or higher
- npm 10.0.0 or pnpm 9.0.0+
- Optional: Spicetify CLI (for Spotify Desktop integration)
- Optional: Cloudflare Wrangler CLI (for backend worker deployment)

### Installation
```bash
git clone https://github.com/heysoybruno099/brus-lyrics.git
cd brus-lyrics
npm install
npm run build
```

### Running Tests
Execute the comprehensive test suite across shared types, TTML parser/validator, API worker routes, and ingestion scripts:
```bash
npm test
```

---

## Spotify Desktop Integration (Spicetify)

The Spicetify extension provides a full-window viewport overlay with a dynamic blurred album art backdrop and bottom playbar control button.

### Automatic Installation
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-spicetify.ps1
```
Or via npm script:
```bash
npm run install:spicetify
```

### Features
- **Playbar Button**: Injected directly into Spotify's bottom-right controls bar (`.main-nowPlayingBar-extraControls`) adjacent to the native lyrics microphone button.
- **Top Bar Clearance**: Strictly offsets below Spotify's navigation bar (`top: 64px`) and reserves a 180px right-side safe margin so window controls (Minimize, Maximize, Close) are never obstructed.
- **Dynamic Blurred Backdrop**: Scales and blurs album art (`filter: blur(80px) saturate(2.2) brightness(0.28)`) with color extraction matching the current track.
- **Fullscreen Mode**: Top-right toggle button to switch between window-contained and true fullscreen mode.
- **Keyboard Shortcut**: Press `Escape` to close the lyrics view at any time.

---

## YouTube Music Extension

The YouTube Music extension mounts cleanly into YouTube Music's right-hand side panel.

### Building
```bash
cd packages/ytm-extension
npm run build
```

### Loading in Browser (Chrome / Brave / Edge)
1. Open your browser and navigate to `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select:
   ```text
   brus-lyrics/packages/ytm-extension/dist
   ```
4. Open [music.youtube.com](https://music.youtube.com). The "LYRICS" tab is automatically enabled on all songs with Bru's Lyrics rendered in place.

---

## Cloudflare Worker & D1 Backend

The API worker runs globally on Cloudflare's edge network.

### Local Development
```bash
cd packages/api-worker
npx wrangler dev --port 8787
```

### Automated Live Deployment
Deploy database migrations, seed verified songs, and publish the worker:
```bash
npm run deploy:api
```

### API Endpoints
- `GET /v1/lyrics?trackId={id}&title={title}&artist={artist}&duration={ms}&platform=spotify`: Resolves verified TTML with source headers.
- `GET /v1/catalog?page=1&limit=50&q={query}`: Paginated verified catalog search.
- `POST /v1/submit`: Submits new TTML payloads with XML validation.
- `GET /health`: Service health status.

---

## Sync Studio

An interactive workstation for creating and editing syllable-synchronized TTML documents.

### Running Locally
```bash
npm run dev --workspace=@brus-lyrics/sync-studio
```
Studio runs at `http://localhost:5173`.

### Key Features
- **Tap-to-Sync Matrix**: Keyboard-driven syllable timing tagging (Spacebar / Enter).
- **AI Syllable Interpolation**: Estimates syllable boundaries from raw audio waveforms and line boundaries.
- **Live Preview Deck**: Dual-view split showing live animated rendering alongside real-time TTML XML output.
- **Direct Export**: One-click download of compliant `.ttml` files ready for `/database/inbox/`.

---

## TTML Schema Specification

Every lyrics file in `/database/ttml/` adheres to the following specification:

```xml
<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" 
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata" 
    xmlns:itunes="http://music.apple.com/lyric-ttml-extensions">
  <head>
    <metadata>
      <itunes:song>Song Title</itunes:song>
      <itunes:artist>Artist Name</itunes:artist>
      <itunes:album>Album Name</itunes:album>
      <itunes:duration>03:45.00</itunes:duration>
      <itunes:spotifyId>1ipcb9qXpSHWhSUvdxJhsx</itunes:spotifyId>
      <itunes:timing>Syllable</itunes:timing>
    </metadata>
  </head>
  <body>
    <div>
      <!-- Main Vocal Line (Agent v1) -->
      <p begin="00:12.45" end="00:15.80" ttm:agent="v1">
        <span begin="00:12.45" end="00:13.10">First </span>
        <span begin="00:13.10" end="00:14.20">syllable </span>
        <span begin="00:14.20" end="00:15.80">timing</span>
      </p>

      <!-- Second Vocalist / Duet (Agent v2) -->
      <p begin="00:16.00" end="00:19.50" ttm:agent="v2">
        <span begin="00:16.00" end="00:17.40">Answer </span>
        <span begin="00:17.40" end="00:19.50">phrase</span>
      </p>

      <!-- Background Vocals / Ad-Libs -->
      <p begin="00:20.00" end="00:22.50" ttm:agent="v1">
        <span begin="00:20.00" end="00:21.20">Lead </span>
        <span begin="00:21.20" end="00:22.50">vocal</span>
        <span begin="00:20.50" end="00:22.50" ttm:role="x-bg"> (ad-lib background)</span>
      </p>
    </div>
  </body>
</tt>
```

---

## Contributing

1. Add your `.ttml` file to `database/inbox/`.
2. Run `npm run ingest` to validate, calculate durations, and update `database/catalog.json`.
3. Run `npm test` to verify syntax and test compliance.
4. Submit a Pull Request. Continuous Integration will automatically validate and commit catalog modifications.

---

## License

MIT License. Designed and maintained for high-fidelity lyrics reproduction.
