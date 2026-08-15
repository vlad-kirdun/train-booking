import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyPage, EmptyResults } from "@/components/empty-results";
import { PageFailure } from "@/components/page-failure";
import { Pagination } from "@/components/pagination";
import { ResultsError } from "@/components/results-error";
import { ResultsSkeleton } from "@/components/results-skeleton";
import { SearchForm } from "@/components/search-form";
import { SortLinks } from "@/components/sort-links";
import { TrainCard } from "@/components/train-card";
import {
  EMPTY_ROUTE,
  resolveRoute,
  routeDescription,
  type RouteSelection,
  routeTitle,
} from "@/domain/route";
import {
  buildSearchPath,
  parseSearchQuery,
  type SearchQuery,
  serializeSearchQuery,
} from "@/domain/search-query";
import { getSearchResults, getStations, type Station } from "@/lib/api";

export async function generateMetadata(
  props: PageProps<"/trains">,
): Promise<Metadata> {
  const { query, route } = await resolveSearch(props);

  return {
    title: routeTitle(route),
    description: routeDescription(route),
    // Filtered and paged variants stay out of the index in the SEO pass; this
    // keeps the noise down until then.
    robots: hasFilters(query) ? { index: false, follow: true } : undefined,
  };
}

export default async function TrainsPage(props: PageProps<"/trains">) {
  const { query, route, stations, stationsError } = await resolveSearch(props);

  if (stationsError !== undefined) {
    // Without the directory there is no form worth showing, so this is a page
    // failure rather than a section failure — rendered on the server, because
    // the error boundary would leave the document body empty until hydration.
    return (
      <PageFailure error={stationsError} retryHref={buildSearchPath(query)} />
    );
  }

  const searchKey = serializeSearchQuery(query).toString();

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {routeTitle(route)}
        </h1>
        <p className="text-muted text-sm">{routeDescription(route)}</p>
      </header>

      <SearchForm
        // Remounts on navigation so the controls always mirror the address bar.
        key={searchKey}
        stations={stations}
        query={query}
      />

      {route.unknown.length > 0 && (
        <p role="status" className="text-sm">
          We do not know a station called{" "}
          <strong>{route.unknown.join(", ")}</strong>, so it was left out of
          this search.
        </p>
      )}

      {/* Only the results wait on the API. The form above is interactive while
          the request is still in flight, and the key restarts the skeleton for
          each new search instead of leaving the previous results on screen. */}
      <Suspense key={searchKey} fallback={<ResultsSkeleton />}>
        <Results query={query} route={route} />
      </Suspense>
    </main>
  );
}

async function Results({
  query,
  route,
}: {
  query: SearchQuery;
  route: RouteSelection;
}) {
  let results;
  try {
    // Unknown slugs are dropped rather than forwarded, so the results can never
    // contradict what the form is showing.
    results = await getSearchResults({
      ...query,
      from: route.from?.slug,
      to: route.to?.slug,
    });
  } catch (error) {
    // Caught here rather than left to the error boundary: a failed list should
    // not take the search form down with it.
    return <ResultsError error={error} query={query} />;
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-muted text-sm" aria-live="polite">
          {results.total === 1
            ? "1 train found"
            : `${String(results.total)} trains found`}
        </h2>
        <SortLinks query={query} />
      </div>

      {results.items.length > 0 && (
        <ul className="grid gap-3">
          {results.items.map((train) => (
            <li key={train.id}>
              <TrainCard train={train} query={query} />
            </li>
          ))}
        </ul>
      )}

      {results.items.length === 0 &&
        (results.total === 0 ? (
          <EmptyResults query={query} />
        ) : (
          <EmptyPage query={query} />
        ))}

      <Pagination
        query={query}
        page={results.page}
        totalPages={results.totalPages}
      />
    </section>
  );
}

async function resolveSearch(props: PageProps<"/trains">): Promise<{
  query: SearchQuery;
  route: RouteSelection;
  stations: Station[];
  stationsError: unknown;
}> {
  const [searchParams, directory] = await Promise.all([
    props.searchParams,
    // Cached for a day: the directory changes about never, and a cache hit here
    // is what keeps the shell alive even when the API is completely down.
    getStations({ cache: "force-cache", revalidate: 86_400 }).then(
      (stations) => ({ ok: true as const, stations }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);
  const query = parseSearchQuery(searchParams);

  if (!directory.ok) {
    return {
      query,
      route: EMPTY_ROUTE,
      stations: [],
      stationsError: directory.error,
    };
  }

  return {
    query,
    route: resolveRoute(query, directory.stations),
    stations: directory.stations,
    stationsError: undefined,
  };
}

function hasFilters(query: SearchQuery): boolean {
  return (
    query.date !== undefined || query.maxPrice !== undefined || query.page > 1
  );
}
