import type { Train } from "@/lib/api";

import type { SearchQuery, SortOption } from "./search-query";

export const RESULTS_PER_PAGE = 10;

export interface SearchResults {
  items: Train[];
  /**
   * Matches after the budget filter, not the upstream total. Pagination is
   * derived from this number, so using the raw upstream count here would
   * advertise pages that do not exist.
   */
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

/**
 * The whole results pipeline, as a pure function.
 *
 * The order is load-bearing. The API has no price filter, so the budget is
 * applied here first; only then can sorting and pagination describe the set the
 * user actually asked for.
 */
export function buildSearchResults(
  trains: readonly Train[],
  query: SearchQuery,
): SearchResults {
  const affordable = filterByMaxPrice(trains, query.maxPrice);
  const sorted = sortTrains(affordable, query.sort);

  return paginate(sorted, query.page);
}

/** Inclusive: a €80 budget keeps an €80 train. */
export function filterByMaxPrice(
  trains: readonly Train[],
  maxPrice: number | undefined,
): Train[] {
  if (maxPrice === undefined) return [...trains];

  return trains.filter((train) => train.price <= maxPrice);
}

const byPrice: Record<SortOption, (a: Train, b: Train) => number> = {
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
};

/**
 * Sorted here rather than upstream, because pagination happens here and the two
 * have to agree about the order.
 *
 * Prices repeat heavily in this dataset, so the tie-break is not cosmetic:
 * without a total order, two requests could order equal-priced trains
 * differently and a user paging through would see the same train twice while
 * another disappeared.
 */
export function sortTrains(
  trains: readonly Train[],
  sort: SortOption,
): Train[] {
  const compare = byPrice[sort];

  return [...trains].sort(
    (a, b) =>
      compare(a, b) ||
      a.departureDate.localeCompare(b.departureDate) ||
      a.departureTime.localeCompare(b.departureTime) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * A page beyond the end comes back empty rather than clamped to the last page:
 * the URL is the state, so silently showing page 2 to someone who asked for
 * page 99 would make the address bar lie.
 */
export function paginate(
  trains: readonly Train[],
  page: number,
  pageSize: number = RESULTS_PER_PAGE,
): SearchResults {
  const total = trains.length;
  const requestedPage = Math.max(1, page);
  // Never zero, so "page 1 of 1" still reads correctly with no results.
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (requestedPage - 1) * pageSize;

  return {
    items: trains.slice(start, start + pageSize),
    total,
    page: requestedPage,
    totalPages,
    pageSize,
  };
}
