# Train search

A dedicated train search section: find trains between two cities, filter by budget, compare
options and book seats.

## Getting started

```bash
npm ci
```

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Start at `/trains`.

No configuration is required — the API base URL defaults to the public assignment API. To point
it elsewhere, or to set the absolute base used by canonical tags and the sitemap, copy
`.env.example` to `.env.local` and edit it.

### Other commands

| Command                 | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `npm run build`         | Production build                               |
| `npm start`             | Serve the production build                     |
| `npm run lint`          | ESLint — zero errors and zero warnings         |
| `npm run typecheck`     | Route type generation + `tsc --noEmit`         |
| `npm test`              | Unit and component tests                       |
| `npm run test:coverage` | Tests with coverage thresholds enforced        |
| `npm run verify`        | Everything above plus the build — what CI runs |

## What was implemented

The brief describes a landing surface for organic search that has to survive all the way to a
completed booking, so the scope was chosen around three things that could not be traded away:
**results in the server-rendered HTML**, **the URL as the only source of search state**, and
**seat availability that is never overstated**. Everything below follows from those.

**Search and results**

- `/trains`, server-rendered and mobile-first. Station pickers with a swap, optional date,
  maximum budget, price sorting, pagination.
- The form is a real `method="get"` form that works without JavaScript, and upgrades to a
  client-side navigation with a clean canonical URL when JavaScript is available. Its values go
  through the same parser the URL uses, so a typed value and a pasted value cannot be read
  differently.
- Sorting and pagination are plain links, so every state is shareable, crawlable and reachable
  with the back button.
- Budget filtering, sorting and pagination run **on the server**, over the whole route dataset,
  because the API has no price filter. The result count is the post-filter count, so pagination
  never advertises pages the budget has already excluded.
- Dead ends offer a way out: an empty result links to the same search with one specific filter
  removed, and a page past the end links back to page one.

**Train page and booking**

- `/trains/[id]`, fetched uncached so the seat count is the current one rather than a cached
  snapshot. It carries the search that led to it, so the way back is the same page of the same
  ordering. A withdrawn train answers with a real `404`, not a soft one.
- Booking goes through a Server Action, so the API base URL never reaches the browser and the
  form works without JavaScript.
- **No optimistic UI.** The only figure ever presented as fact is one the server returned.
- The `409` path is a first-class flow: it reports the real remaining count, lowers the form's
  limit to it, expires the cached lists that were showing the stale number, and offers the way
  back to the other trains on the same search.

**Saved trains**

- Kept in `localStorage`, shown in a pinned block above the results with a badge on matching
  cards in the list. Deliberately not reordered into the list: a train saved from page 3 would
  still never appear on page 1, which is the opposite of why it was saved.
- A saved train does not remember how many seats were left — a frozen seat count is the same
  false availability the booking flow refuses to show.
- Reads tolerate corrupted JSON, schema drift, missing storage and quota errors; one unreadable
  entry drops out without taking the rest of the shortlist with it.

**Loading, failure and SEO**

- The page shell streams immediately with a results skeleton, so the form is usable while the
  search is still in flight. Measured first byte: ~16 ms against an API that took the full
  timeout budget to give up.
- Failures are handled where they happen rather than at a boundary, so a broken results list
  does not take the search form with it. Messages distinguish slow, unreachable and misbehaving.
- Every request is bounded by a total time budget across all retries, not just per attempt.
- Route-aware titles and descriptions, a canonical collapsing every filtered view onto one
  address, `noindex, follow` elsewhere, `BreadcrumbList` structured data, `robots.txt`, and a
  `sitemap.xml` built from the routes that actually run trains. The `/trains` hub links those
  routes internally.

**Engineering**

- Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, Zod, Vitest + React Testing
  Library + MSW.
- 263 tests. 100% line and branch coverage on `src/domain`, `src/lib/api`, `src/lib/actions` and
  the saved-trains store — the places where a bug costs money. Components get critical-path
  tests instead of coverage for its own sake.
- No Redux, Zustand or TanStack Query: search state is the URL and saved trains are the store
  above, so a client cache would only duplicate what React Server Components already do.
- CI runs lint, typecheck, coverage and build on every push.

Architecture decisions and the verified API contract are documented in [CLAUDE.md](CLAUDE.md).

## What was not implemented and why

**Ruled out by the brief or the API**

- **Accounts and cross-device sync.** The brief puts them next quarter with no backend today, so
  saved trains are local to the device and say so in the UI.
- **Seat selection or a seat map.** `POST /bookings` accepts a seat _count_; there is no seat
  inventory to render.
- **Payment and checkout.** Not in the brief, and no endpoint for it.
- **A "my bookings" list.** A booking returns an id, but there is no endpoint to read bookings
  back, so the list could not be built from anything real.
- **Return trips and connections.** The data models single direct journeys.
- **Live seat updates.** No polling or push endpoint exists. The problem is solved instead by
  fetching the train page uncached and treating the `409` as authoritative.

**Deliberate product decisions**

- **Optimistic booking UI.** It displays availability that may be false, which is the exact
  failure the brief calls out.
- **Infinite scroll.** A results page has to be shareable and indexable; an endless list is
  neither, and half of sales arrive from search.
- **Filters beyond budget** — carriage class, departure window, operator. The data supports
  them, but they are not in the flow the brief describes, and each one multiplies the URL states
  to canonicalise.
- **Indexing individual trains.** A departure is transient inventory; indexing thousands of them
  would fill the index with URLs that stop existing. They are `noindex, follow` and absent from
  the sitemap.
- **Train photos.** The API supplies one per train, but they are stock images that say nothing
  about which train to pick, and remote images in a list cost exactly the load speed the brief
  calls critical.
- **Internationalisation and multi-currency.** No signal in the brief.

**Cut for time, and what I would do next**

- **A collapsible filter panel on narrow screens.** With 60% mobile traffic, a results-first
  layout would be better than a tall form above the list. The JavaScript-free ways to make
  `<details>` responsive are unreliable across engines, so it was deferred rather than hacked.
- **An end-to-end test suite.** The critical flows were verified by hand against the live API
  instead — including a real seat race, four distinct API failure modes and a cold-cache
  outage — but Playwright coverage of the booking path is the first thing I would add.
- **A one-sided route page** ("trains from Berlin"). Plausible as a search, thin as a page today;
  it needs its own content before it deserves indexing.

## Assumptions

**Things the API does that the brief's endpoint table does not mention**

These were established by probing the live service, and several of them changed the design.

- **`date=YYYY-MM-DD` works.** It is absent from the published table, but filtering by it works
  and omitting it searches all dates — exactly the optional-date behaviour the brief asks for. I
  used it and assumed it is supported rather than incidental.
- **There is no price filter.** `maxPrice`, `priceMax` and similar are silently ignored and the
  response comes back unfiltered with the full `total`. Budget filtering is therefore ours.
- **`seats: 0` returns `201` and books one seat.** The client must reject a non-positive count
  itself; nothing downstream will object. Both the API client and the Server Action do.
- **`POST /bookings` returns the fresh `seatsLeft`** in its `201` body, so the confirmation needs
  no second request.
- **`/stations` returns a dictionary keyed by slug**, not an array, and holds eleven German
  cities. The brief's examples (Paris, Amsterdam) do not exist in the data; I used the real
  stations.
- **Unknown `sortBy` values are ignored rather than rejected**, so sort options are validated
  against a whitelist on our side.

**Decisions I made where the brief was silent**

- **Fetching the whole route dataset per search.** Because there is no upstream price filter, the
  server requests the route's trains in one call (`limit=1000`), then filters, sorts and
  paginates locally. **This is only sound because the dataset is tiny** — 141 trains overall, at
  most ~18 on a route, verified against the live API. A real catalogue would need `maxPrice`
  supported upstream, and `getSearchResults` throws rather than filtering a truncated response so
  the day that stops being true is loud instead of silent.
- **Currency and locale.** Prices are unlabelled numbers; I assumed EUR, matching the brief's
  "€80", and fixed the formatting locale to `en-GB` so server and client cannot disagree.
- **`sort` is one URL parameter** (`price_asc` / `price_desc`) rather than the API's
  `sortBy` + `sortOrder` pair. The URL is a product surface that gets shared and indexed, so it
  is shaped for readers; the results pipeline translates.
- **Ten results per page.**
- **Cache lifetimes:** the results list 60 s (a browsing surface, and the cache is what absorbs
  the slow API), the station directory 24 h, the train page not at all.
- **Timeouts:** 8 s per attempt with a 12 s ceiling across all retries. Measured against a hung
  API, per-attempt timeouts alone kept a user waiting 24.8 s.
- **A shortlist holds 20 trains,** oldest dropped first.
- **Impossible dates such as `2026-02-31` are rejected in the URL parser.** The API answers them
  with an empty list, which a user reads as "no trains" rather than "broken link".
- **`POST /reset` is never called from the test suite.** It is a shared sandbox and tests must be
  isolated; it was only used by hand, and the sandbox was reset after each manual booking run.

## AI agent logs

The full transcript of the session that produced this repository is included ([ai-logs-full-session.md](ai-logs-full-session.md)). Each commit message records the reasoning behind that step, including the problems
found by running the app rather than by reading the code.
