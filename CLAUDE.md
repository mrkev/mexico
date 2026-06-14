# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use `pnpm` and are run from the repo root.

```bash
# Install dependencies
pnpm install

# Start dev server for the site
pnpm dev                   # or: pnpm --filter site dev

# Build everything (nx orchestrates dependency order)
pnpm build

# Build only the site
pnpm build:site

# Build only the mexico library (unused — see below)
pnpm build:lib

# Lint
pnpm lint
```

The site dev server runs at `http://localhost:5173` by default.

## Architecture

This is a pnpm monorepo managed by Nx with two packages:

### `packages/site` — the active app

A React + Vite single-page app that renders an interactive map of the Guadalajara metropolitan area (Guadalajara, Zapopan, Tlaquepaque, Tonalá). Key pieces:

- **`src/wikidata.tsx`** — fetches place data from the Wikidata SPARQL endpoint. `queryAll()` takes a list of Wikidata city QIDs and returns a `Map<QID, Place>`. Each place has coordinates, label, `instanceOf` types, and optional Wikipedia article links in `es`/`en`. SPARQL results filter to only items that have at least one Wikipedia article.
- **`src/icons.tsx`** — defines the `markers` object which maps category names to Leaflet icons and Wikidata `instanceOf` label strings. `iconFor(instanceOf: Set<string>)` walks `markers` in order to find the first matching category. SVG icons are served as static assets from the `docs/` output directory.
- **`src/App.tsx`** — main component. Uses `react-leaflet` for the map and `@mrkev/marked-subbable` for reactive state (`mSet`/`useLink`). The sidebar toggle panel drives which marker categories are visible via the `sel` set.

**Build output**: Vite builds directly into `../../docs/` (the repo root `docs/` folder), which is served as a GitHub Pages site. The `base: "./"` config makes asset paths relative so GitHub Pages routing works correctly.

### `packages/mexico` — unused library stub

This package exists but is not actively used. Its `src/` contains only placeholder files (`add.ts`, `index.ts`) and the `package.json` has unfilled TODO fields. Ignore it unless explicitly working on it.

## Key dependencies

- `react-leaflet` / `leaflet` — map rendering
- `wikibase-sdk` — builds SPARQL query URLs and simplifies results
- `betterknown` — parses WKT geometry strings (coordinates come from Wikidata as WKT `POINT(lon lat)`)
- `@mrkev/marked-subbable` — reactive state library (local, linked from a sibling repo at `play_play/substate`)
- Radix UI primitives + Tailwind CSS v4 — UI components in `src/components/ui/`
