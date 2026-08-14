import { describe, expect, test } from "vitest";

import { makeTrain } from "@/test/fixtures";

import { EMPTY_SEARCH_QUERY, type SearchQuery } from "./search-query";
import {
  buildSearchResults,
  filterByMaxPrice,
  paginate,
  RESULTS_PER_PAGE,
  sortTrains,
} from "./search-results";

const query = (overrides: Partial<SearchQuery> = {}): SearchQuery => ({
  ...EMPTY_SEARCH_QUERY,
  ...overrides,
});

const priced = (...prices: number[]) =>
  prices.map((price) => makeTrain({ price }));

describe("filterByMaxPrice", () => {
  test("keeps a train priced exactly at the budget", () => {
    const trains = priced(79, 80, 81);

    expect(filterByMaxPrice(trains, 80).map((t) => t.price)).toEqual([79, 80]);
  });

  test("keeps everything when no budget is set", () => {
    const trains = priced(23, 115);

    expect(filterByMaxPrice(trains, undefined)).toEqual(trains);
  });

  test("can return nothing", () => {
    expect(filterByMaxPrice(priced(90, 100), 50)).toEqual([]);
  });

  test("does not mutate the input", () => {
    const trains = priced(90, 10);

    filterByMaxPrice(trains, 50);

    expect(trains.map((t) => t.price)).toEqual([90, 10]);
  });
});

describe("sortTrains", () => {
  test("orders cheapest first", () => {
    const sorted = sortTrains(priced(89, 23, 74), "price_asc");

    expect(sorted.map((t) => t.price)).toEqual([23, 74, 89]);
  });

  test("orders most expensive first", () => {
    const sorted = sortTrains(priced(89, 23, 74), "price_desc");

    expect(sorted.map((t) => t.price)).toEqual([89, 74, 23]);
  });

  // Prices repeat heavily in this dataset. Without a total order, two requests
  // could order equal-priced trains differently and someone paging through
  // would see one train twice while another vanished.
  test("breaks ties by date, then time, then id — in both directions", () => {
    const trains = [
      makeTrain({
        id: "b",
        price: 31,
        departureDate: "2026-08-20",
        departureTime: "09:00",
      }),
      makeTrain({
        id: "a",
        price: 31,
        departureDate: "2026-08-20",
        departureTime: "09:00",
      }),
      makeTrain({
        id: "c",
        price: 31,
        departureDate: "2026-08-20",
        departureTime: "07:45",
      }),
      makeTrain({
        id: "d",
        price: 31,
        departureDate: "2026-08-15",
        departureTime: "23:00",
      }),
    ];

    expect(sortTrains(trains, "price_asc").map((t) => t.id)).toEqual([
      "d",
      "c",
      "a",
      "b",
    ]);
    expect(sortTrains(trains, "price_desc").map((t) => t.id)).toEqual([
      "d",
      "c",
      "a",
      "b",
    ]);
  });

  test("does not mutate the input", () => {
    const trains = priced(89, 23);

    sortTrains(trains, "price_asc");

    expect(trains.map((t) => t.price)).toEqual([89, 23]);
  });
});

describe("paginate", () => {
  const trains = priced(...Array.from({ length: 25 }, (_, index) => index + 1));

  test("returns the first page and the page count", () => {
    const result = paginate(trains, 1, 10);

    expect(result.items).toHaveLength(10);
    expect(result.items[0]?.price).toBe(1);
    expect(result).toMatchObject({ total: 25, page: 1, totalPages: 3 });
  });

  test("returns a partial last page", () => {
    expect(paginate(trains, 3, 10).items).toHaveLength(5);
  });

  // The URL is the state: showing page 2 to someone who asked for page 99 would
  // make the address bar lie about what they are looking at.
  test("returns an empty page beyond the end rather than clamping", () => {
    const result = paginate(trains, 99, 10);

    expect(result.items).toEqual([]);
    expect(result).toMatchObject({ page: 99, totalPages: 3 });
  });

  test("reports one page when there are no results at all", () => {
    expect(paginate([], 1, 10)).toMatchObject({ total: 0, totalPages: 1 });
  });

  test("treats a page below one as the first page", () => {
    expect(paginate(trains, 0, 10)).toMatchObject({ page: 1 });
  });

  test("defaults to the shared page size", () => {
    expect(paginate(trains, 1).pageSize).toBe(RESULTS_PER_PAGE);
  });
});

describe("buildSearchResults", () => {
  test("applies the budget before counting, so pagination matches what is shown", () => {
    const trains = priced(20, 30, 40, 200, 300);

    const result = buildSearchResults(trains, query({ maxPrice: 50 }));

    // The upstream would have reported 5. Advertising that would promise pages
    // of results the budget has already excluded.
    expect(result.total).toBe(3);
    expect(result.items.map((t) => t.price)).toEqual([20, 30, 40]);
  });

  test("sorts what survived the budget, not the original list", () => {
    const trains = priced(300, 40, 20, 30);

    const result = buildSearchResults(
      trains,
      query({ maxPrice: 50, sort: "price_desc" }),
    );

    expect(result.items.map((t) => t.price)).toEqual([40, 30, 20]);
  });

  test("pages through the filtered and sorted set", () => {
    const trains = priced(...Array.from({ length: 12 }, (_, i) => i + 1));

    const result = buildSearchResults(trains, query({ page: 2 }));

    expect(result.items.map((t) => t.price)).toEqual([11, 12]);
    expect(result).toMatchObject({ total: 12, totalPages: 2 });
  });

  test("handles a search that matches nothing", () => {
    const result = buildSearchResults(priced(90), query({ maxPrice: 10 }));

    expect(result).toMatchObject({ items: [], total: 0, totalPages: 1 });
  });
});
