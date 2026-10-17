# WatchPick

A responsive React + Vite movie and TV discovery app with plain CSS, localStorage, and live TMDB data. No accounts or database. WatchPick recommends titles; it does not stream or download media or claim streaming availability.

## Run locally

Use Node.js 22.12+.

```sh
npm install
cp .env.example .env.local
```

Set `VITE_TMDB_READ_TOKEN` in `.env.local` privately, then run:

```sh
npm run dev
```

Open the Local URL printed by Vite. Restart Vite after changing environment configuration. Local environment files are ignored by Git.

**Discovery and search require TMDB configuration and an internet connection.** Demo mode has been removed. Missing configuration displays setup guidance and disables new searches and picks. API failures show errors and a retry option, without an offline catalog fallback. Existing local watchlists and histories remain accessible.

## TMDB setup and credentials

Create or sign in to your own [TMDB account](https://www.themoviedb.org), open Settings → API, and apply for access after reviewing the current terms. Copy the **API Read Access Token**, not your account password or a user-session token, into your local environment file:

```dotenv
VITE_TMDB_READ_TOKEN=your_actual_api_read_access_token
```

Never send credentials through chat or commit them. **Every `VITE_` value is public in browser builds**, including this application token. Ignoring `.env.local` prevents Git exposure but does not conceal the value from visitors or network tools. If the credential must remain secret, use a server-side/serverless endpoint that stores `TMDB_READ_TOKEN` in the hosting environment and forwards only allowed TMDB read requests, with rate limiting and caching. Such a server is not included in this static MVP.

TMDB describes its API as free for non-commercial use with attribution. Contact TMDB for commercial licensing if applicable. Relevant official documentation:

- [Application authentication](https://developer.themoviedb.org/docs/authentication-application)
- [FAQ, access, and attribution](https://developer.themoviedb.org/docs/faq)
- [Discover movies](https://developer.themoviedb.org/reference/discover-movie) / [Discover TV](https://developer.themoviedb.org/reference/discover-tv)
- [Movie genres](https://developer.themoviedb.org/reference/genre-movie-list) / [TV genres](https://developer.themoviedb.org/reference/genre-tv-list)
- [Movie details](https://developer.themoviedb.org/reference/movie-details) / [TV details](https://developer.themoviedb.org/reference/tv-series-details)
- [Movie search](https://developer.themoviedb.org/reference/search-movie) / [TV search](https://developer.themoviedb.org/reference/search-tv)
- [Approved branding](https://www.themoviedb.org/about/logos-attribution) / [API terms](https://www.themoviedb.org/api-terms-of-use)

## Features

- Movie, TV Series, or Either with shared genre selections mapped to separately fetched movie and TV genre lists.
- Mood presets for Comedy, Mystery, Adventure, and Thriller.
- Release/premiere-era filtering; minimum TMDB user ratings of 6, 7, or 8 with at least 50 votes.
- Movie runtime preferences: up to 100 minutes, 101–140 minutes, or 141+ minutes; series remain unaffected.
- Random picks from the fetched matching pool, avoiding repeats until eligible candidates are exhausted. Changing preferences resets the pool and result. Surprise me resets preferences and makes a random media choice and pick.
- Search by title, separately for movies and TV, independent of discovery filters. Opening search results fetches details and resets discovery preferences.
- Saved watchlist with remove and watched actions; watched titles are excluded, with undo in collapsible history.
- Recently saved, A–Z, newest release, and highest known rating watchlist sorting.
- Last 12 distinct picks persisted locally, with revisit and clear controls.
- Versioned JSON library export/import. Imports validate and merge files up to 2 MB without deleting current entries. Watched exclusions win over watchlist duplicates. Backups exclude credentials and pick history.
- Loading, errors, missing metadata/posters, empty matches, keyboard focus states, responsive layouts, and reduced-motion support.

Discover fetches 1, 3 (default), or 5 pages per selected media type: up to 20, 60, or 100 candidates per type, doubled for Either. It stops at TMDB’s last available page and deduplicates results. Randomness is over these fetched results, **not the entire TMDB catalog**. Search also uses one page per selected media type. Adult content is disabled in queries and rejected in selected-title details; this is not an age-rating filter.

Movie `title`/`release_date` and TV `name`/`first_air_date` normalize into one shape. Identities include media type because movie/TV IDs may overlap. Legacy locally saved records retain their previous source marker for backward compatibility and are labeled “Previously saved”; they are never used as an API fallback.

## Local data and images

The library uses `watchpick-library-v1`; recent picks use `watchpick-recent-picks-v1`. Data stays on the browser/origin without cross-device synchronization. Invalid stored records recover gracefully; write failures show a session-only warning.

The hero cycles through four local real-title backdrops in shuffled rounds, persisted in sessionStorage, with no consecutive repeat at round boundaries. Local editorial poster previews are decorative and do not supply recommendation candidates. Their source records are in `src/data/featured.js`, with image attribution in `public/posters/ATTRIBUTION.md`. Older illustrations remain solely to render previously saved records.

About & Credits displays TMDB's approved logo and required notice:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

The unmodified TMDB logo is bundled locally as `public/tmdb.svg`, avoiding failures from the remote asset host. The Wikimedia mirror identifies its original TMDB asset source; author and license details are recorded in `public/tmdb-attribution.txt` and linked from the credits. Its original colors and aspect ratio are preserved.

## Design

Instrument Sans headings and Public Sans interface text, a cool black/slate palette with lime accents, compact navigation, cinematic imagery, and poster-led cards. Native CSS handles entrances, hover effects, image focus, and save feedback. Reduced-motion preferences are respected. Fonts use Google Fonts with local sans-serif fallbacks.

## Validate and deploy

```sh
npm test
npm run lint
npm run build
npm run preview
```

For static hosting, use `npm ci`, build command `npm run build`, and output `dist`. Set public environment configuration before building. Root deployment is assumed by local image paths. `npm run preview` is only a local preview server.

All 52 automated tests, lint, and production build pass. Tests include fixture-based selection/storage checks, filters, history, library merging, hero rotation, and mocked API requests. The old fixed catalog is retained only as test fixtures under `tests/fixtures`; it is not bundled into the application. Browser visual/interaction QA and real-token API validation were unavailable during these checks. No local credential contents were read or printed.

Manual smoke check: pick several times, change filters, search and open a title, save it, reload, sort/remove it, mark a title watched, undo its exclusion, revisit a recent pick, and round-trip a library backup. Try unavailable networking and missing configuration, and check narrow layouts plus keyboard navigation.

## Header shortcuts

Search opens title search and focuses its input. Quick pick resets preferences and starts a surprise recommendation, then moves to the result (or its error message). Activity opens a dropdown with recent picks, watched-history, and saved-title counts and links; choosing a section opens and focuses it. The dropdown closes on outside press or Escape; Escape restores focus to its trigger. Header controls collapse to accessible labeled icon buttons on mobile.

## Personal collection features

Ten additional features extend the local library:

1. **Favorites:** star saved or watched titles. Favorites remain attached when moving a title between saved and watched states.
2. **Personal ratings:** rate a saved or watched title from 1–5, or clear the rating. These values are private browser data, never TMDB user ratings and never submitted to TMDB.
3. **Private notes:** expand “Your notes & rating” and write up to 1,000 characters per title. Changes save locally as you type; browser storage failures still produce the main persistence warning.
4. **Watchlist search:** matches title, genre, and private notes, ignoring case.
5. **Watchlist media filter:** show movies, TV series, or both without affecting discovery preferences.
6. **Favorites-only watchlist:** combine with search and media filters; clear library filters to see all saved titles again.
7. **Pick from watchlist:** opens a random title from the currently visible saved titles. It avoids the current result when another title is available, resets discovery preferences, and never chooses watched titles.
8. **Collection statistics:** saved, watched, favorites, movie and series totals, plus watched percentage based on the saved/watched library. These are local collection metrics, not catalog-wide or account metrics.
9. **Original-language preference:** choose a language under advanced discovery filters. Uses TMDB's `with_original_language` on both movie and TV Discover; it does not promise subtitle, dubbed-audio, or streaming availability.
10. **Copy title links:** result cards and library entries copy their canonical TMDB page link. If clipboard access fails, a selectable field appears for manual copying. Private notes, ratings, preferences, and tokens are never put in the link.

Notes, favorites, and personal ratings persist in `watchpick-title-notes-v1`. Removing a saved title retains its annotations so they return if the title is saved again. Library exports include annotations only for exported saved/watched titles. Imports accept older version-1 backups without annotations, validate optional annotations before altering the library, and preserve existing local annotations where an imported record conflicts. Notes are private to this browser unless you explicitly export a backup containing them; there is no cloud sync.

The collection UI is split into `CollectionSection.jsx`, `CollectionControls.jsx`, `CollectionStats.jsx`, `TitleNotes.jsx`, `WatchedHistory.jsx`, and `ShareTitle.jsx`, with pure data helpers in `src/lib/collection.js`. Ten new automated tests exercise state, validation, reloads, filtering, watchlist randomness, statistics, sharing URL construction, and original-language queries. Clipboard interaction and visual browser behavior still require manual checking.

## Shared discovery, planning, and offline access

All ten features from the latest expansion are implemented:

1. **Pick with friends:** expand “Picking with friends?” and enable group preferences for 2–6 viewers on the same device. Each can accept movies, series, or either, plus multiple genres. Results must satisfy the intersection of everyone’s acceptable genres and media types, along with the main discovery filters. Empty genre selections mean any genre. Incompatible preferences produce an explicit error. This is a local group session, not live remote collaboration.
2. **Three-choice mode:** select “Give me three choices.” The app draws up to three distinct unseen candidates, loads details, and lets you open one. If fewer candidates remain in the current round, it shows only those; it never pads with duplicates. The next round begins once the eligible pool is exhausted.
3. **Not interested:** hide a recommendation without marking it watched. Hidden titles are excluded from random discovery; “Allow again” in the Not interested section restores them. Explicitly saved copies remain in the library.
4. **Custom collections:** create folders under “Your collections,” assign a title from “Your notes & rating,” and filter the watchlist by folder. Each title belongs to one collection or Unfiled. Deleting a folder retains titles and supports undo.
5. **Spoiler-free overviews:** “Hide plot overviews” replaces recommendation descriptions with a reveal disclosure. Titles, genres, posters, taglines, and other metadata remain visible.
6. **Movie-night planner:** choose a saved title and a date. Plans can be rescheduled, removed, and restored with undo. Plans retain a copy of the title even if it is later removed from the watchlist. No reminders, notifications, invitations, or calendar integrations are sent.
7. **Series progress:** saved/watched series have manual season and episode fields under notes. This records the last episode watched; it does not infer episode counts or mark the complete series watched. Zero means not started/unspecified. Progress is retained when watched exclusions are undone.
8. **Undo notifications:** the last save/remove/watched operation can be reversed from a persistent toast. Hidden-title actions, collection deletion, and planner addition/removal also support undo. Notifications do not auto-expire; a new supported action replaces the previous undo. Undo changes the affected record only, preserving unrelated edits. Importing a backup clears stale undo history.
9. **Larger candidate pools:** choose 1, 3, or 5 Discover pages per media type. Default is three. Group genre choices use TMDB’s OR genre filter after intersecting the viewers’ choices. This remains a fetched subset, not the entire TMDB catalog.
10. **Installable offline library:** a manifest, 192/512 PNG icons, and generated service worker support home-screen installation and offline access to local saved data after an online visit. New TMDB discovery and search still need a connection; demo mode is not reintroduced.

Folders, hidden titles, movie plans, group preferences, and spoiler settings persist in `watchpick-workspace-v1`. Title collection membership and series progress extend `watchpick-title-notes-v1` without invalidating older backups. Library exports include this workspace and relevant annotations; imports validate everything before changing data, accept older backups, merge without duplicate plans, and preserve local conflicts. Existing enabled group preferences take precedence; imported spoiler-hiding remains enabled if either backup or local setting requests it.

### Test installation and offline access

```sh
npm run build
npm run preview
```

Open the preview URL online, wait for the service worker to install, then reload. Use “Add to home screen” in the discovery-experience panel. Supporting browsers offer a native install prompt; others show instructions for the browser menu or Safari’s Share → Add to Home Screen. Production requires HTTPS (localhost is allowed). Installation availability depends on the browser; the app does not force a prompt.

The service worker is registered **only for production builds**, never `npm run dev`. The build generates `dist/sw.js` with a content-versioned shell cache. App HTML/assets and bundled artwork support offline reloads; up to 96 previously requested TMDB poster images can be cached. Images loaded before the worker became active may require a later online visit to enter the cache. Other missing images use the normal fallback. API requests and authenticated responses are never cached. Offline launches default to the watchlist, and a connection banner explains limits. Updates use the normal service-worker waiting lifecycle and remove only outdated WatchPick shell caches; close existing app tabs to activate a newly installed worker.

Automated coverage includes group intersections/conflicts, nonrepeating multi-choice draws, exclusions, collection membership, valid planner dates, progress persistence, backward-compatible workspace import, targeted undo, multipage caps/deduplication, offline shell/poster serving, cache bounds, cache updates, and API-cache bypass. All 52 tests, lint, and production build pass. Production HTML, service worker, manifest, and install icon returned HTTP 200 with expected content types. Icon dimensions and all 29 generated precache entries were verified. Browser install prompts, layout, and real offline transitions still require manual verification because no browser automation surface was available.

## Rotating featured posters

The welcome poster row now loads a mixed movie/TV preview pool from a random TMDB Discover page (1–5) on page load. It draws four distinct posters and remembers their IDs in sessionStorage so the next reload or “Refresh previews” action avoids the previous set whenever enough alternatives exist. Refreshing the row does not change discovery preferences, recommendation history, or saved titles. The page shares its startup request across React StrictMode effects to avoid duplicate requests.

If previews cannot load, clearly labeled bundled editorial artwork rotates from an eight-title set; this is only decorative imagery and never an offline recommendation catalog. New searches and picks still require live TMDB. Poster loading states and fallbacks remain in place. Four added automated tests verify rotation, storage recovery, small-pool behavior, and live preview query handling.
