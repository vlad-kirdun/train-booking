import { describe, expect, test } from "vitest";

import type { Station } from "@/lib/api";

import { EMPTY_ROUTE, type RouteSelection } from "./route";
import { EMPTY_SEARCH_QUERY, type SearchQuery } from "./search-query";
import {
  breadcrumbListJsonLd,
  canonicalSearchPath,
  shouldIndexSearch,
} from "./seo";

const berlin: Station = {
  slug: "berlin",
  code: "BER",
  name: "Berlin",
  country: "Germany",
};
const munich: Station = {
  slug: "munich",
  code: "MUC",
  name: "Munich",
  country: "Germany",
};

const route = (from?: Station, to?: Station): RouteSelection => ({
  from,
  to,
  unknown: [],
});
const query = (overrides: Partial<SearchQuery> = {}): SearchQuery => ({
  ...EMPTY_SEARCH_QUERY,
  ...overrides,
});

describe("canonicalSearchPath", () => {
  // A query-based scheme reaches the same results through many near-identical
  // addresses. Without one canonical they compete with each other.
  test("strips filters, sorting and paging", () => {
    expect(canonicalSearchPath(route(berlin, munich))).toBe(
      "/trains?from=berlin&to=munich",
    );
  });

  test("points the hub at itself", () => {
    expect(canonicalSearchPath(EMPTY_ROUTE)).toBe("/trains");
  });

  // Built from the resolved route, so a slug that names no station cannot end
  // up in a canonical tag.
  test("does not canonicalise to a station that does not exist", () => {
    expect(canonicalSearchPath({ ...EMPTY_ROUTE, unknown: ["atlantis"] })).toBe(
      "/trains",
    );
  });
});

describe("shouldIndexSearch", () => {
  test("indexes the hub and a clean route pair", () => {
    expect(shouldIndexSearch(query(), EMPTY_ROUTE)).toBe(true);
    expect(shouldIndexSearch(query(), route(berlin, munich))).toBe(true);
  });

  test.each([
    ["a date", query({ date: "2026-08-15" })],
    ["a budget", query({ maxPrice: 80 })],
    ["a non-default sort", query({ sort: "price_desc" })],
    ["a page beyond the first", query({ page: 2 })],
  ])("keeps a view narrowed by %s out of the index", (_case, narrowed) => {
    expect(shouldIndexSearch(narrowed, route(berlin, munich))).toBe(false);
  });

  // Plausible as a search, thin as a page — and it still passes links onward.
  test("keeps a one-sided route out of the index", () => {
    expect(shouldIndexSearch(query(), route(berlin))).toBe(false);
    expect(shouldIndexSearch(query(), route(undefined, munich))).toBe(false);
  });
});

describe("breadcrumbListJsonLd", () => {
  test("numbers the trail and makes every item an absolute URL", () => {
    const data = breadcrumbListJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Berlin to Munich trains", path: "/trains?from=berlin" },
      ],
      "https://example.test",
    );

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://example.test/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Berlin to Munich trains",
          item: "https://example.test/trains?from=berlin",
        },
      ],
    });
  });
});
