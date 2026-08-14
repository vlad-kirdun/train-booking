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

## What was not implemented and why

_To be completed at submission._

## Assumptions

_To be completed at submission. The API findings that drive the architecture are documented in
[CLAUDE.md](CLAUDE.md) under "API contract" and will be summarised here._

## Project notes

Architecture decisions, the verified API contract and the working agreements for this codebase
live in [CLAUDE.md](CLAUDE.md).
