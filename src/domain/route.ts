import type { Station } from "@/lib/api";

import type { SearchQuery } from "./search-query";

export interface RouteSelection {
  from: Station | undefined;
  to: Station | undefined;
  /**
   * Slugs that look like stations but name none. A link can arrive with
   * `from=atlantis`; silently searching every route instead would show results
   * that contradict the address bar.
   */
  unknown: string[];
}

/** Stands in when the station directory could not be loaded at all. */
export const EMPTY_ROUTE: RouteSelection = {
  from: undefined,
  to: undefined,
  unknown: [],
};

export function resolveRoute(
  query: Pick<SearchQuery, "from" | "to">,
  stations: readonly Station[],
): RouteSelection {
  const bySlug = new Map(stations.map((station) => [station.slug, station]));
  const unknown: string[] = [];

  const resolve = (slug: string | undefined): Station | undefined => {
    if (slug === undefined) return undefined;

    const station = bySlug.get(slug);
    if (station === undefined) unknown.push(slug);
    return station;
  };

  return { from: resolve(query.from), to: resolve(query.to), unknown };
}

/**
 * Phrased the way people search — "Berlin to Munich trains" is the query the
 * brief says half of sales arrive on, so it is also the page's heading and the
 * basis of its title.
 */
export function routeTitle({ from, to }: RouteSelection): string {
  if (from && to) return `${from.name} to ${to.name} trains`;
  if (from) return `Trains from ${from.name}`;
  if (to) return `Trains to ${to.name}`;
  return "All trains";
}

export function routeDescription({ from, to }: RouteSelection): string {
  if (from && to) {
    return `Compare ${from.name} to ${to.name} train times and prices, then book your seats.`;
  }
  if (from)
    return `Find trains departing from ${from.name} and book your seats.`;
  if (to) return `Find trains arriving in ${to.name} and book your seats.`;
  return "Search trains between cities, compare prices and book your seats.";
}
