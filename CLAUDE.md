# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

A dedicated train search section, built as the first version of a product slice. It is not a
generic list page: roughly half of the product's sales come from organic Google searches like
"Berlin to Munich trains", so this is a landing surface for search traffic that has to survive
all the way to a completed booking.

Backend is a fixed external API that we do not own and must not modify, fork, or run locally.

## Three requirements that are never traded away

Everything else in this file follows from these. If a change conflicts with one of them, the
change is wrong.

1. **Results must be in the server-rendered HTML.** Not fetched after hydration. Organic search
   is the main revenue channel; a client-rendered list forfeits it.
2. **The URL is the single source of truth for search state.** Users share result links through
   messaging apps and the recipient must see the same search. No hidden client state may affect
   what is rendered.
3. **Seat availability shown to the user must be truthful.** The server's response is the only
   authority. See "Booking" below.

Secondary but load-bearing: 60% of traffic is mobile, so layout is mobile-first; the API is slow
and intermittently unavailable, so loading and error states are functional requirements, not
polish.

## Stack

Next.js 16.3 (App Router) · React 19.2 · TypeScript strict · Tailwind CSS v4 · Zod · Vitest +
React Testing Library + MSW · ESLint 9 flat config + Prettier.

Turbopack is the default bundler in Next 16 for both `next dev` and `next build`, so no
`--turbopack` flag belongs in the scripts.

`AGENTS.md` contains a block that `next dev` regenerates on every run. Leave it in place and
commit it with your work; deleting it only produces a dirty tree on the next dev server start.

## Commands

```bash
npm ci                 # install
npm run dev            # dev server
npm run build          # production build
npm run lint           # ESLint — zero errors and zero warnings
npm run typecheck      # next typegen && tsc --noEmit
npm test               # Vitest, single run
npm run test:coverage  # Vitest with coverage thresholds enforced
npm run format         # Prettier
npm run verify         # lint + typecheck + test:coverage + build — the gate for every step
```

`typecheck` runs `next typegen` first because the generated route types under `.next/types`
are what make `PageProps` and `LayoutProps` resolve. On a clean clone `tsc` alone would fail.

## Layout

```
src/
  app/                  # App Router routes, server components by default
    trains/             # search results page
    trains/[id]/        # train detail + booking
  domain/               # pure business logic — no I/O, no React
  lib/api/              # HTTP client, Zod schemas, typed errors
  components/           # UI; client components marked "use client"
  test/                 # MSW handlers, setup
```

`src/domain` must stay pure and framework-free: no `fetch`, no React, no Next imports. That is
what makes the price/sort/pagination logic exhaustively testable.

## API contract

Base URL comes from `TRAIN_API_BASE_URL`. Server-side only — it must never reach the browser.

| Method | Endpoint                                                  | Notes                                              |
| ------ | --------------------------------------------------------- | -------------------------------------------------- |
| `GET`  | `/trains?from=&to=&date=&sortBy=&sortOrder=&page=&limit=` | `{ data, total, page, limit }`                     |
| `GET`  | `/trains/:id`                                             | `200` / `404`                                      |
| `POST` | `/bookings`                                               | body `{ trainId, seats? }` → `201` / `400` / `409` |
| `GET`  | `/stations`                                               | city directory                                     |
| `POST` | `/reset`                                                  | test-only seat reset                               |

### Verified behaviour — read this before touching the data layer

These were established by probing the live API. They differ from the written spec in ways that
have already caused design decisions; do not "fix" code that looks odd here without re-checking.

- **`date=YYYY-MM-DD` works** even though it is absent from the published endpoint table.
  Omitting it searches all dates, which is exactly the "date is optional" behaviour the product
  needs.
- **There is no price filter.** `maxPrice`, `priceMax` and friends are silently ignored — the
  response comes back unfiltered with the full `total`. Budget filtering is ours to implement.
- **`seats: 0` returns `201` and books one seat** (falsy default upstream). The client must
  validate `seats >= 1` itself; never rely on the server rejecting a zero.
- **`POST /bookings` returns the fresh `seatsLeft`** in its `201` body. Use it to update the UI
  instead of issuing another request.
- Errors share one shape: `{ "error": string }` for `400`, `404`, and `409`. One parser handles
  all of them.
- `/stations` returns a **dictionary keyed by slug**, not an array:
  `{ "berlin": { code, name, country }, ... }`. Eleven German cities.
- `from`/`to` are case-insensitive (`berlin` matches `Berlin`).
- Unknown `sortBy` values are ignored rather than rejected, so validate against a whitelist here.
- Cold starts take a couple of seconds. The slow API in the brief is real.

## Next.js 16 behaviour that this project depends on

Next 16 differs from earlier versions in ways that would otherwise silently break the design
above. Confirmed against the bundled docs in `node_modules/next/dist/docs/`, which is the
version-matched source of truth — read it before writing framework code.

- **`fetch` is not cached by default.** Caching is opt-in: pass `cache: "force-cache"`, with
  `next: { revalidate, tags }` for lifetime and invalidation. Assuming the old
  cached-by-default behaviour would turn the route-dataset request into an upstream call on
  every render — the opposite of what the slow API needs.
- **`params` and `searchParams` are Promises** and must be awaited; the synchronous
  compatibility shim from 15 is gone. Type them with the generated `PageProps<'/trains'>` and
  `LayoutProps<'/'>` helpers rather than hand-written interfaces.
- **`revalidateTag` takes a `cacheLife` profile as its second argument.** The single-argument
  form is a type error. For a booking, where stale-while-revalidate would show the seat count
  we just invalidated, prefer `updateTag` for immediate expiry.
- Turbopack is the default for `next build`; a stray `webpack` config would fail the build.
- `next lint` was removed — lint through the ESLint CLI, which is what `npm run lint` does.

## Rules that follow from the contract

### Price filtering and pagination happen on the server, in our code

Because the API has no price filter, `getSearchResults` fetches the whole route dataset in one
request (`limit=1000`, explicitly cached with `cache: "force-cache"`) and then applies
**filter by price → sort → paginate** in `src/domain`.

Never filter by price on the client over the current page. With a €80 budget that would show 3
cards out of 20, report a `total` that does not match what is displayed, and produce pages of
inconsistent size. `total` must always be the count _after_ price filtering.

This approach is only sound because the dataset is tiny (141 records overall, at most ~18 per
route). It is documented in the README as a scaling caveat: a real catalogue would require the
API to support `maxPrice`.

### Booking

Mutations go through a **Server Action**, never a client `fetch` to the external API. That keeps
the base URL server-side, works without JavaScript, and lets `revalidatePath` refresh the
results list after a successful booking.

**Optimistic UI is forbidden here.** It displays availability that may be false, which is the
exact failure the brief calls out. The action returns a typed result rather than throwing, so
each outcome is an ordinary render:

- `201` → confirmation, using `seatsLeft` from the response.
- `409` → prominent "not enough seats" message, refetch the train to show the real remaining
  count, and a clear path back to the other results with the original search preserved. This
  branch is a primary user flow, not an edge case — it never gets cut for time.
- `400` / network → distinguishable messages with a retry.

### Freshness

The results list may serve cached data — it is a browsing surface, and the cache is also what
absorbs the slow upstream. The detail page must not: accurate seat counts matter more there
than cache hits, so it leaves `fetch` uncached (the Next 16 default) rather than opting in.

### Saved trains

Stored in `localStorage` — accounts and cross-device sync are explicitly next quarter, with no
backend today. Implemented with `useSyncExternalStore` so that `getServerSnapshot` prevents
hydration mismatches and multiple components stay in sync without a state library.

Saved trains render in a **pinned block above the result list**, with a badge on matching cards
in the list itself. They are deliberately not reordered inline: reordering only affects the
visible page, so a saved train sitting on page 3 would never surface on page 1 — which is the
opposite of what the user asked for when they saved it.

Reads must tolerate corrupted JSON, schema drift, a missing `localStorage`, and quota errors.

## State management

Search state lives in the URL. Saved trains live in the store above. That is all the state there
is, and it is why this project has **no Redux, Zustand, or TanStack Query** — a client cache
would duplicate what React Server Components already do. Do not add one.

`src/domain/search-query.ts` is the only place that reads or writes the URL contract. Nothing
else may reach into `searchParams` directly, or the guarantees below stop holding.

| Parameter  | Values                      | Default     |
| ---------- | --------------------------- | ----------- |
| `from`     | station slug                | —           |
| `to`       | station slug                | —           |
| `date`     | `YYYY-MM-DD`                | all dates   |
| `maxPrice` | positive integer, inclusive | no ceiling  |
| `sort`     | `price_asc` \| `price_desc` | `price_asc` |
| `page`     | integer ≥ 1                 | `1`         |

Note that `sort` is one parameter, not the API's `sortBy` + `sortOrder` pair. The URL is a
product surface that gets shared and indexed, so it is shaped for readers rather than mirroring
the upstream; `getSearchResults` translates.

Two properties are load-bearing and have tests of their own:

- **Deterministic.** Fields serialise in a fixed order and defaults are omitted, so the same
  search always yields the same string. Without this, "the recipient sees the same search"
  degrades into near-identical links, and canonical tags and caches stop lining up.
- **Total.** Any input parses. Out-of-range values are clamped and invalid ones dropped rather
  than throwing, because a link mangled by a chat app must still open a usable page. Impossible
  dates such as `2026-02-31` are rejected here — the API answers them with an empty list, which
  a user reads as "no trains" rather than "broken link".

Whether a slug names a real station is not checked here; that needs `/stations` and happens at
the page level. `withSearchQuery` resets to page 1 on any change other than paging itself.

## SEO

The URL scheme is query-based (`/trains?from=berlin&to=munich`) by an explicit product decision.
Do not propose migrating to path URLs; instead get the most out of this scheme:

- `generateMetadata` per route pair, phrased the way people search.
- `canonical` pointing at the clean `?from=X&to=Y` form.
- `noindex, follow` for filtered combinations and pages beyond the first.
- JSON-LD, `robots.txt`, and a `sitemap.xml` built from real station pairs.
- A `/trains` hub that links popular routes internally.

## Testing

- **Vitest + React Testing Library + MSW.** Mock HTTP, not our own modules — tests must run
  through the real client code, including timeouts, retries, and error parsing.
- **100% line and branch coverage for `src/domain` and `src/lib/api`.** That is where a bug costs
  money: pricing, filtering, URL parsing, status-code handling.
- **React components get critical-path tests, not coverage for its own sake**: the 409 branch,
  empty results, error recovery, saving a train.
- **Never call `POST /reset` from a test.** It is a shared sandbox; tests must be isolated.

The thresholds live in `vitest.config.mts` as per-directory globs, so they bind only to the two
directories above and are enforced by `npm run test:coverage` in CI.

`src/test/msw/handlers.ts` is deliberately empty. Each suite registers what it needs with
`server.use(...)`, and `onUnhandledRequest: "error"` turns any un-stubbed request into a failing
test rather than a real network call. `src/test/harness.test.ts` guards that guarantee: if it
starts failing, treat every other API test as untrustworthy until it is fixed.

Async Server Components cannot be rendered by Vitest. Test them by extracting the logic into
`src/domain` / `src/lib`, and cover the rendered output through the server-HTML checks described
in the README verification steps.

## Definition of done

Every step produces a working slice of functionality. A step is finished only when all four hold:

1. the feature works end to end;
2. tests meet the thresholds above;
3. `npm run lint` reports zero errors _and_ zero warnings;
4. `npm run build` succeeds.

CI runs `lint → typecheck → test → build` so this is enforced rather than remembered. One step,
one commit.
