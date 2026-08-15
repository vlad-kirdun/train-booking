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

`lint` and `typecheck` each run `next typegen` first. The generated route types under
`.next/types` are what make `PageProps` and `LayoutProps` resolve; without them the type-checked
ESLint rules see `any` and a clean clone fails with eighteen unsafe-assignment errors before
`typecheck` ever gets a chance to generate anything. Keep every script self-sufficient rather
than relying on the order inside `verify`.

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
API to support `maxPrice`. `getSearchResults` enforces that boundary — if the upstream ever
reports more trains than it returned, it throws instead of filtering a truncated dataset, since
quietly showing the wrong cheapest train is a failure nobody would notice.

Sorting is local too, and not delegated to the API's `sortBy`. Pagination happens here, so the
order has to be decided here or the two would disagree. The comparator carries an explicit
tie-break on date, then time, then id: prices repeat heavily in this dataset — a single route
can hold four pairs of identical prices — and without a total order two requests could order
them differently, so a user paging through would see one train twice while another vanished.

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

`bookSeats` calls `updateTag(TRAINS_CACHE_TAG)` on both `201` and `409`. The conflict case
matters as much as the success: a `409` proves the seat count in every cached list is wrong, so
leaving those lists alone would keep advertising seats that do not exist.

After a Server Action, Next re-renders the current route, so the availability line above the
form updates from the same response — verified against the live API by draining a train to two
seats, taking both from outside the browser, then submitting. No stale number survives anywhere
on the page.

A Server Action is a public endpoint. Validate its `FormData` as untrusted input: a field is a
string _or a `File`_, and `String(file)` yields `"[object File]"` rather than failing, so read
fields through a helper that rejects anything that is not a string.

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

Reads must tolerate corrupted JSON, schema drift, a missing `localStorage`, and quota errors. A
single unreadable entry is dropped; it does not take the rest of somebody's shortlist with it.
A failed write still updates the in-memory list, so the shortlist works for the session even
when the browser refuses to persist it.

**A saved train never remembers `seatsLeft`.** A seat count frozen at the moment of saving is
exactly the false availability requirement 3 rules out. The saved card links to the train's own
page, which reads the real figure.

The empty-on-the-server behaviour is asserted, not assumed: `saved-trains-panel.test.tsx`
renders the panel through `renderToStaticMarkup` with a populated shortlist and expects empty
output. If the server ever rendered a list it cannot know about, hydration would throw the tree
away.

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
- **100% line and branch coverage for `src/domain`, `src/lib/api` and `src/lib/actions`.** That is
  where a bug costs money: pricing, filtering, URL parsing, status-code handling, booking.
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

When asserting on server-rendered markup with `grep`, remember React splits interpolated text
with `<!-- -->` markers, so `Page 1 of 15` appears as `Page <!-- -->1<!-- --> of <!-- -->15`.
Match around the interpolation, not through it.

## Failure and loading states

The brief asks that these not make the site look broken, which makes them
functionality rather than polish. Three rules, each of which came out of watching a real
failure rather than reasoning about one.

- **Handle expected failures where they happen, not at the boundary.** `error.tsx` is a client
  component: when a Server Component throws, the document arrives with an empty `<body>` and the
  message only appears after hydration — never, without JavaScript. A blank first paint is
  exactly the failure being avoided. So the results section catches its own error and renders
  `ResultsError` inline, and a missing station directory renders `PageFailure` from the server.
  The boundary stays a net for the genuinely unexpected.
- **A failed results list must not take the form with it.** Catching inside the Suspense boundary
  keeps the search usable, so the user can retry or change the search instead of losing what they
  typed.
- **Retry links are plain anchors**, not router calls: a full document request works without
  JavaScript and cannot replay a stale client cache.

`apiRequest` enforces `budgetMs` (12s) across all attempts, not just `timeoutMs` (8s) per
attempt. Measured against a hung API, per-attempt timeouts alone kept the user waiting 24.8
seconds; the budget brings that to 12. Do not raise it without re-checking what the wait feels
like.

### `loading.tsx` costs the response status — keep it off `/trains/[id]`

A `loading.tsx` file makes its segment stream, and it applies to child segments too. Once the
shell has flushed, the status is already `200`, so a `notFound()` reached afterwards renders the
right page with the wrong status — a withdrawn train would answer a crawler with a working page.
Measured: with a loading file, `/trains/999999` returned `200`; without one, `404`.

Hence the layout. The search page lives in the `(search)` route group with its loading file, so
the boundary covers `/trains` and nothing else. `/trains/[id]` has no loading file and keeps its
`404`. The tap feedback it loses is replaced by `LinkPendingHint`, a `useLinkStatus` client
component inside the card link — the case the Next docs describe for exactly this situation.

Do not add `app/trains/loading.tsx` or `app/trains/[id]/loading.tsx`. Either one silently
reintroduces the soft 404.

The stale-cache fallback comes from the framework rather than our code: `force-cache` with
`revalidate` keeps serving the last good response while revalidation fails in the background.
With the API completely down but the cache warm, the heading, the form and the station options
still render and only the results area reports the failure.

## UI conventions

- **Navigation over interaction.** Sorting and pagination are links, not controls: each state is
  its own address, so it is shareable, crawlable and reachable with the back button, at no
  JavaScript cost. Do not replace them with client-side handlers.
- **The form submits by navigating.** It is a real `method="get"` form so it works without
  JavaScript; the submit handler upgrades that to a client-side push of the canonical path
  built by `buildSearchPath`. Form values are fed through `parseSearchQuery`, the same parser
  the URL uses, so a typed value and a pasted value cannot be read differently.
- **Native `<select>` for stations**, not a custom listbox. On mobile — 60% of traffic — it
  opens the platform picker, which beats anything we would build, and it survives without
  JavaScript. Reach for Radix only where a native element genuinely cannot do the job.
- **Dead ends offer a way out.** An empty result links to the search with one specific filter
  removed; a page past the end links back to page one. "No results" on its own leaves the user
  guessing which of four inputs is at fault.
- **Seat counts in the list are labelled as a snapshot**, never as a promise. The list is served
  from cache; the detail page and the booking response are the authority.
- **Repeated controls get an explicit `aria-label`.** A list of twenty buttons all called "Save"
  is unusable by voice or screen reader. Do not assemble the name from a visually hidden span
  next to the visible text — accessible-name computation collapses the whitespace between them
  and produces "SaveBerlin to Munich". Write the whole name in `aria-label`, keeping the visible
  word as its first token so the spoken name still matches what is on screen.
- **A control inside a stretched-link card needs `relative z-10`**, or the tap opens the card
  instead of operating the control.

## Definition of done

Every step produces a working slice of functionality. A step is finished only when all four hold:

1. the feature works end to end;
2. tests meet the thresholds above;
3. `npm run lint` reports zero errors _and_ zero warnings;
4. `npm run build` succeeds.

CI runs `lint → typecheck → test → build` so this is enforced rather than remembered. One step,
one commit.
