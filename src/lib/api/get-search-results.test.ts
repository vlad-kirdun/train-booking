import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";

import { EMPTY_SEARCH_QUERY, type SearchQuery } from "@/domain/search-query";
import { makeTrain } from "@/test/fixtures";
import { server } from "@/test/msw/server";

import { DEFAULT_API_BASE_URL } from "./config";
import {
  getSearchResults,
  ROUTE_DATASET_LIMIT,
  SEARCH_CACHE_SECONDS,
  TRAINS_CACHE_TAG,
} from "./get-search-results";

const endpoint = `${DEFAULT_API_BASE_URL}/trains`;

const query = (overrides: Partial<SearchQuery> = {}): SearchQuery => ({
  ...EMPTY_SEARCH_QUERY,
  ...overrides,
});

function respondWith(prices: number[], total = prices.length) {
  server.use(
    http.get(endpoint, () =>
      HttpResponse.json({
        data: prices.map((price) => makeTrain({ price })),
        total,
        page: 1,
        limit: ROUTE_DATASET_LIMIT,
      }),
    ),
  );
}

test("filters by budget, sorts and paginates over the whole route dataset", async () => {
  respondWith([120, 45, 80, 30, 200]);

  const result = await getSearchResults(query({ maxPrice: 80 }));

  expect(result.items.map((train) => train.price)).toEqual([30, 45, 80]);
  expect(result.total).toBe(3);
});

describe("the upstream request", () => {
  test("asks for the entire route in one call and never for the API's own sort", async () => {
    const seen = vi.fn<(search: string) => void>();
    server.use(
      http.get(endpoint, ({ request }) => {
        seen(new URL(request.url).search);
        return HttpResponse.json({
          data: [],
          total: 0,
          page: 1,
          limit: ROUTE_DATASET_LIMIT,
        });
      }),
    );

    await getSearchResults(
      query({
        from: "berlin",
        to: "munich",
        date: "2026-08-15",
        sort: "price_desc",
      }),
    );

    // maxPrice, sort and page are ours to apply — sending them would either be
    // ignored by the API or disagree with local pagination.
    expect(seen).toHaveBeenCalledWith(
      `?from=berlin&to=munich&date=2026-08-15&limit=${String(ROUTE_DATASET_LIMIT)}`,
    );
  });

  test("opts into the Next cache, which is what absorbs the slow API", async () => {
    const init = vi.fn<(value: RequestInit) => void>();
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, options) => {
      init(options ?? {});
      return originalFetch(input, options);
    });
    respondWith([]);

    await getSearchResults(query());

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: SEARCH_CACHE_SECONDS, tags: [TRAINS_CACHE_TAG] },
      }),
    );

    vi.mocked(globalThis.fetch).mockRestore();
  });
});

// Filtering a truncated dataset would quietly show the wrong cheapest train,
// and neither the user nor the reviewer would have any way to notice.
test("refuses to filter a truncated dataset", async () => {
  respondWith([30, 40], 5000);

  await expect(getSearchResults(query())).rejects.toThrow(/maxPrice/);
});

test("accepts a dataset the API reports as complete", async () => {
  respondWith([30, 40], 2);

  await expect(getSearchResults(query())).resolves.toMatchObject({ total: 2 });
});
