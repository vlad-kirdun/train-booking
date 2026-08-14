import type { Metadata } from "next";

import { EmptyPage, EmptyResults } from "@/components/empty-results";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
import { SortLinks } from "@/components/sort-links";
import { TrainCard } from "@/components/train-card";
import { resolveRoute, routeDescription, routeTitle } from "@/domain/route";
import {
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
  const { query, route, stations } = await resolveSearch(props);

  // Unknown slugs are dropped rather than forwarded, so the results can never
  // contradict what the form is showing.
  const results = await getSearchResults({
    ...query,
    from: route.from?.slug,
    to: route.to?.slug,
  });

  const heading = routeTitle(route);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {heading}
        </h1>
        <p className="text-muted text-sm">{routeDescription(route)}</p>
      </header>

      <SearchForm
        // Remounts on navigation so the controls always mirror the address bar.
        key={serializeSearchQuery(query).toString()}
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
                <TrainCard train={train} />
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
    </main>
  );
}

async function resolveSearch(props: PageProps<"/trains">): Promise<{
  query: SearchQuery;
  route: ReturnType<typeof resolveRoute>;
  stations: Station[];
}> {
  const [searchParams, stations] = await Promise.all([
    props.searchParams,
    getStations({ cache: "force-cache", revalidate: 86_400 }),
  ]);
  const query = parseSearchQuery(searchParams);

  return { query, route: resolveRoute(query, stations), stations };
}

function hasFilters(query: SearchQuery): boolean {
  return (
    query.date !== undefined || query.maxPrice !== undefined || query.page > 1
  );
}
