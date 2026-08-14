/**
 * The URL contract for the search page.
 *
 * Search state lives in the URL and nowhere else: users share result links
 * through messaging apps and the recipient has to see the same search. Every
 * read and write of that URL goes through this module, so there is exactly one
 * definition of what a link means.
 *
 * Two properties matter and are covered by tests:
 *
 * - **Deterministic.** The same search always serialises to the same string,
 *   regardless of the order the fields were assigned, so a shared link is
 *   byte-identical and caches and canonical tags line up.
 * - **Total.** Any input parses. Junk parameters are dropped rather than
 *   throwing, because a mangled link from a chat app should still open a
 *   usable page.
 */

export const SORT_OPTIONS = ["price_asc", "price_desc"] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = "price_asc";
export const DEFAULT_PAGE = 1;

export interface SearchQuery {
  /** Station slug, e.g. `berlin`. */
  from: string | undefined;
  to: string | undefined;
  /** `YYYY-MM-DD`. Absent means "any date", which the brief asks for. */
  date: string | undefined;
  /** Budget ceiling in euro, inclusive. */
  maxPrice: number | undefined;
  sort: SortOption;
  page: number;
}

export const EMPTY_SEARCH_QUERY: SearchQuery = {
  from: undefined,
  to: undefined,
  date: undefined,
  maxPrice: undefined,
  sort: DEFAULT_SORT,
  page: DEFAULT_PAGE,
};

/** Accepts both `URLSearchParams` and the record shape Next hands to a page. */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>;

export function parseSearchQuery(input: SearchParamsInput): SearchQuery {
  const read = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }
    const value = input[key];
    // A repeated parameter is a broken link, not a request for both values.
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    from: parseStationSlug(read("from")),
    to: parseStationSlug(read("to")),
    date: parseIsoDate(read("date")),
    maxPrice: parseMaxPrice(read("maxPrice")),
    sort: parseSort(read("sort")),
    page: parsePage(read("page")),
  };
}

/**
 * Fields are written in a fixed order and defaults are omitted, so every way of
 * expressing the same search collapses to one string.
 */
export function serializeSearchQuery(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.from !== undefined) params.set("from", query.from);
  if (query.to !== undefined) params.set("to", query.to);
  if (query.date !== undefined) params.set("date", query.date);
  if (query.maxPrice !== undefined)
    params.set("maxPrice", String(query.maxPrice));
  if (query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  if (query.page !== DEFAULT_PAGE) params.set("page", String(query.page));

  return params;
}

export function buildSearchPath(query: SearchQuery): string {
  const params = serializeSearchQuery(query).toString();
  return params === "" ? "/trains" : `/trains?${params}`;
}

/** Applies a change and returns to page 1: page 3 of the old filter is meaningless. */
export function withSearchQuery(
  query: SearchQuery,
  changes: Partial<SearchQuery>,
): SearchQuery {
  return { ...query, page: DEFAULT_PAGE, ...changes };
}

/**
 * A `YYYY-MM-DD` string that is also a real calendar date. The pattern alone
 * would let `2026-02-31` through and the API would answer with an empty list,
 * which reads to the user as "no trains" rather than "bad link".
 */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function parseStationSlug(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  const slug = value.trim().toLowerCase();
  // Whether the slug names a real station is checked against /stations where
  // that list is available; here we only reject shapes that cannot be one.
  return /^[a-z]+(?:-[a-z]+)*$/.test(slug) ? slug : undefined;
}

function parseIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  const date = value.trim();
  return isValidIsoDate(date) ? date : undefined;
}

function parseMaxPrice(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return undefined;

  // Rounded down so the filter can never let through a train over budget.
  return Math.floor(price);
}

function parseSort(value: string | undefined): SortOption {
  return SORT_OPTIONS.find((option) => option === value) ?? DEFAULT_SORT;
}

function parsePage(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PAGE;

  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : DEFAULT_PAGE;
}
