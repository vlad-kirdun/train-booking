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

The app runs at [http://localhost:3000](http://localhost:3000).

No configuration is required: the API base URL defaults to the public assignment API. To point
it elsewhere, copy `.env.example` to `.env.local` and set `TRAIN_API_BASE_URL`.

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

_Filled in as the work lands._

- **Project scaffold.** Next.js 16 App Router with TypeScript strict mode, Tailwind CSS v4, a
  Vitest + React Testing Library + MSW test harness, ESLint flat config with zero-warning
  enforcement, Prettier, and CI running lint, typecheck, coverage and build on every push.
- **API client.** Zod-validated responses, per-request timeouts, backoff retries on `GET` only,
  and a closed set of typed failures (`not_found`, `conflict`, `timeout`, `network`,
  `invalid_response`, …) that the UI layers can branch on. Fully covered by tests.
- **Shareable search URLs.** `?from&to&date&maxPrice&sort&page` parsed and written in one place,
  in a fixed order and without defaults, so the same search always produces the same link and a
  link mangled in transit still opens a usable page.
- **Server-side results pipeline.** Budget filtering, price sorting and pagination run on the
  server over the whole route dataset, because the API has no price filter. The result count is
  the post-filter count, so pagination never promises pages the budget has excluded.
- **Search results page** at `/trains`, server-rendered and mobile-first: station pickers with a
  swap, optional date, budget, price sorting and pagination as plain links, a route-aware title,
  and dead ends that offer to undo one specific filter. The form works without JavaScript and
  upgrades to a clean canonical URL when it is available.

## What was not implemented and why

_To be completed at submission. Known deferrals so far:_

- **Train photos.** The API supplies an `image` per train. They are stock images that carry no
  information for choosing between trains, and remote images on a list view cost exactly the
  load speed the brief calls critical. Skipped in the list.
- **A collapsible filter panel on narrow screens.** The form sits above the results on mobile.
  A results-first layout would be better for the 60% of traffic on phones, but the JavaScript-free
  ways to do it are unreliable across browsers, so it is deferred rather than hacked.

## Assumptions

_To be completed at submission. The API findings that drive the architecture are documented in
[CLAUDE.md](CLAUDE.md) under "API contract" and will be summarised here._

## Project notes

Architecture decisions, the verified API contract and the working agreements for this codebase
live in [CLAUDE.md](CLAUDE.md).
