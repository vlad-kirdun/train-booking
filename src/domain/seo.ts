import type { RouteSelection } from "./route";
import {
  buildSearchPath,
  DEFAULT_PAGE,
  DEFAULT_SORT,
  EMPTY_SEARCH_QUERY,
  type SearchQuery,
} from "./search-query";

/**
 * The one address every variant of a route's search should point at.
 *
 * The URL scheme is query-based by product decision, which means the same
 * results are reachable through a lot of near-identical addresses — sorted,
 * filtered, paged. Collapsing them onto one canonical keeps that from splitting
 * the ranking signal across all of them.
 *
 * Built from the resolved route rather than the raw query, so `from=atlantis`
 * canonicalises to the hub instead of inventing a station.
 */
export function canonicalSearchPath(route: RouteSelection): string {
  return buildSearchPath({
    ...EMPTY_SEARCH_QUERY,
    from: route.from?.slug,
    to: route.to?.slug,
  });
}

/**
 * Only two kinds of page earn an index entry: the hub, and a complete route
 * pair with no filters. Everything else is a view of one of those.
 *
 * A one-sided route — "trains from Berlin" — is a plausible search but a thin
 * page here, so it stays out of the index while still passing links onward.
 */
export function shouldIndexSearch(
  query: SearchQuery,
  route: RouteSelection,
): boolean {
  const unfiltered =
    query.date === undefined &&
    query.maxPrice === undefined &&
    query.sort === DEFAULT_SORT &&
    query.page === DEFAULT_PAGE;

  const isRoutePair = route.from !== undefined && route.to !== undefined;
  const isHub = route.from === undefined && route.to === undefined;

  return unfiltered && (isRoutePair || isHub);
}

export interface Breadcrumb {
  name: string;
  path: string;
}

/**
 * `BreadcrumbList` is deliberately the only structured data here. It is
 * well-supported and true; marking a seat reservation up as a `Product` to
 * chase a rich result would be inventing facts about the page.
 */
export function breadcrumbListJsonLd(
  crumbs: readonly Breadcrumb[],
  siteUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}
