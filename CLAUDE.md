# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use `pnpm` and are run from the repo root.

```bash
# Install dependencies
pnpm install

# Dev server for the site (http://localhost:5173)
pnpm dev

# Build (nx orchestrates dependency order; site builds into ../../docs)
pnpm build         # everything
pnpm build:site    # site only

# Lint
pnpm lint

# Refresh the cached Historia timeline data from Wikidata (run with bun).
# Writes packages/site/src/data/<layer>.json. WDQS rate-limits ~1 req/min,
# so the CLI spaces requests and retries; use --layer to fetch just one.
pnpm --filter site fetch:historia
pnpm --filter site fetch:historia -- --layer cities
```

## Architecture

This is a pnpm monorepo managed by Nx with two packages:

### `packages/site` — the active app

A React + Vite single-page app that renders an interactive map of the Guadalajara metropolitan area (Guadalajara, Zapopan, Tlaquepaque, Tonalá). Key pieces:

- **`src/wikidata.tsx`** — fetches place data from the Wikidata SPARQL endpoint. `queryAll()` takes a list of Wikidata city QIDs and returns a `Map<QID, Place>`. Each place has coordinates, label, `instanceOf` types, and optional Wikipedia article links in `es`/`en`. SPARQL results filter to only items that have at least one Wikipedia article.
- **`src/icons.tsx`** — defines the `markers` object which maps category names to Leaflet icons and Wikidata `instanceOf` label strings. `iconFor(instanceOf: Set<string>)` walks `markers` in order to find the first matching category. SVG icons are served as static assets from the `docs/` output directory.
- **`src/App.tsx`** — the router (React Router `HashRouter`; hash routing is required for static GitHub Pages hosting). `/` redirects to `/guadalajara`.
- **`src/routes/Guadalajara.tsx`** — the map view. Uses `react-leaflet` and `@mrkev/marked-subbable` for reactive state (`mSet`/`useLink`); the sidebar toggle panel drives which marker categories are visible via the `sel` set.
- **`src/routes/Historia.tsx`** — a timeline of pre-Columbian peoples / nations / cities. It reads **only** the cached JSON in `src/data/*.json` (no live Wikidata calls); per-layer toggles colour and show/hide each layer.

**Historia data pipeline** (Wikidata has no clean "is Mesoamerican" predicate, so each layer is a generic class + a country-in-region constraint):
- **`src/historia.sparql.ts`** — the SPARQL selectors, query builder, and parsing. Used **offline only**. See the in-file comments for the query-design rationale (e.g. why `VALUES` is scoped per-branch, and why the human-migration filter is omitted — both to stay under the 60s WDQS timeout).
- **`scripts/fetch-historia.ts`** — a commander CLI (run via bun) that executes each selector and writes the parsed `Entity[]` to `src/data/<layer>.json`.
- **`src/historia.ts`** — the dependency-free shared types/helpers the client imports (no `wikibase-sdk`).

**Build output**: Vite builds directly into `../../docs/` (the repo root `docs/` folder), which is served as a GitHub Pages site. The `base: "./"` config makes asset paths relative so GitHub Pages routing works correctly.

### `packages/mexico` — unused library stub

This package exists but is not actively used. Its `src/` contains only placeholder files (`add.ts`, `index.ts`) and the `package.json` has unfilled TODO fields. Ignore it unless explicitly working on it.

## Key dependencies

- `react-leaflet` / `leaflet` — map rendering
- `wikibase-sdk` — builds SPARQL query URLs and simplifies results
- `betterknown` — parses WKT geometry strings (coordinates come from Wikidata as WKT `POINT(lon lat)`)
- `@mrkev/marked-subbable` — reactive state library (local, linked from a sibling repo at `play_play/substate`)
- Radix UI primitives + Tailwind CSS v4 — UI components in `src/components/ui/`
