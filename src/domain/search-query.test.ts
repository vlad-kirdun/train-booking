import { describe, expect, test } from "vitest";

import {
  buildSearchPath,
  buildTrainPath,
  DEFAULT_SORT,
  EMPTY_SEARCH_QUERY,
  isValidIsoDate,
  parseSearchQuery,
  type SearchQuery,
  serializeSearchQuery,
  withSearchQuery,
} from "./search-query";

const query = (overrides: Partial<SearchQuery> = {}): SearchQuery => ({
  ...EMPTY_SEARCH_QUERY,
  ...overrides,
});

describe("parseSearchQuery", () => {
  test("returns the defaults for an empty search", () => {
    expect(parseSearchQuery(new URLSearchParams())).toEqual(EMPTY_SEARCH_QUERY);
  });

  test("reads a complete search", () => {
    const params = new URLSearchParams(
      "from=berlin&to=munich&date=2026-08-15&maxPrice=80&sort=price_desc&page=3",
    );

    expect(parseSearchQuery(params)).toEqual({
      from: "berlin",
      to: "munich",
      date: "2026-08-15",
      maxPrice: 80,
      sort: "price_desc",
      page: 3,
    });
  });

  test("accepts the record shape a Next page receives", () => {
    expect(parseSearchQuery({ from: "berlin", page: "2" })).toMatchObject({
      from: "berlin",
      page: 2,
    });
  });

  test("takes the first value of a repeated parameter", () => {
    expect(parseSearchQuery({ from: ["berlin", "hamburg"] })).toMatchObject({
      from: "berlin",
    });
  });

  test("survives a repeated parameter with no values", () => {
    expect(parseSearchQuery({ from: [] })).toMatchObject({ from: undefined });
  });

  describe("stations", () => {
    test("normalises case and surrounding whitespace", () => {
      expect(parseSearchQuery({ from: "  Berlin  " })).toMatchObject({
        from: "berlin",
      });
    });

    test("keeps a hyphenated slug", () => {
      expect(parseSearchQuery({ to: "frankfurt-am-main" })).toMatchObject({
        to: "frankfurt-am-main",
      });
    });

    test.each(["", "berlin!", "12345", "berlin munich", "-berlin"])(
      "drops %p rather than passing it to the API",
      (from) => {
        expect(parseSearchQuery({ from })).toMatchObject({ from: undefined });
      },
    );
  });

  describe("date", () => {
    test("keeps a real date", () => {
      expect(parseSearchQuery({ date: "2026-08-15" })).toMatchObject({
        date: "2026-08-15",
      });
    });

    test("keeps a leap day that exists", () => {
      expect(parseSearchQuery({ date: "2028-02-29" })).toMatchObject({
        date: "2028-02-29",
      });
    });

    // The API answers an impossible date with an empty list, which the user
    // reads as "no trains" instead of "this link is broken".
    test.each([
      "2026-02-31",
      "2027-02-29",
      "2026-13-01",
      "15-08-2026",
      "today",
    ])("drops %p", (date) => {
      expect(parseSearchQuery({ date })).toMatchObject({ date: undefined });
    });
  });

  describe("maxPrice", () => {
    test("reads a budget", () => {
      expect(parseSearchQuery({ maxPrice: "80" })).toMatchObject({
        maxPrice: 80,
      });
    });

    test("rounds down so the filter cannot let through a train over budget", () => {
      expect(parseSearchQuery({ maxPrice: "79.9" })).toMatchObject({
        maxPrice: 79,
      });
    });

    test.each(["0", "-5", "abc", "", "   ", "NaN", "Infinity"])(
      "drops %p",
      (maxPrice) => {
        expect(parseSearchQuery({ maxPrice })).toMatchObject({
          maxPrice: undefined,
        });
      },
    );
  });

  describe("sort", () => {
    test("keeps a known option", () => {
      expect(parseSearchQuery({ sort: "price_desc" })).toMatchObject({
        sort: "price_desc",
      });
    });

    test.each(["price", "cheapest", "PRICE_ASC", ""])(
      "falls back to the default for %p",
      (sort) => {
        expect(parseSearchQuery({ sort })).toMatchObject({
          sort: DEFAULT_SORT,
        });
      },
    );
  });

  describe("page", () => {
    test("reads a page number", () => {
      expect(parseSearchQuery({ page: "4" })).toMatchObject({ page: 4 });
    });

    test.each(["0", "-1", "1.5", "abc", ""])(
      "falls back to page 1 for %p",
      (page) => {
        expect(parseSearchQuery({ page })).toMatchObject({ page: 1 });
      },
    );
  });
});

describe("serializeSearchQuery", () => {
  test("writes nothing for an empty search", () => {
    expect(serializeSearchQuery(EMPTY_SEARCH_QUERY).toString()).toBe("");
  });

  test("omits values that are already the default", () => {
    const params = serializeSearchQuery(
      query({ from: "berlin", sort: DEFAULT_SORT, page: 1 }),
    );

    expect(params.toString()).toBe("from=berlin");
  });

  test("writes fields in a fixed order", () => {
    const params = serializeSearchQuery(
      query({
        page: 2,
        sort: "price_desc",
        maxPrice: 80,
        date: "2026-08-15",
        to: "munich",
        from: "berlin",
      }),
    );

    expect(params.toString()).toBe(
      "from=berlin&to=munich&date=2026-08-15&maxPrice=80&sort=price_desc&page=2",
    );
  });

  // The guarantee behind "the recipient sees the same search": two people
  // building the same search must produce the same link, character for character.
  test("is independent of the order the fields were assigned", () => {
    const one: SearchQuery = {
      from: "berlin",
      to: "munich",
      date: undefined,
      maxPrice: 80,
      sort: "price_desc",
      page: 2,
    };
    const other: SearchQuery = {
      page: 2,
      sort: "price_desc",
      maxPrice: 80,
      date: undefined,
      to: "munich",
      from: "berlin",
    };

    expect(serializeSearchQuery(one).toString()).toBe(
      serializeSearchQuery(other).toString(),
    );
  });
});

describe("round trip", () => {
  test.each<SearchQuery>([
    EMPTY_SEARCH_QUERY,
    query({ from: "berlin", to: "munich" }),
    query({ from: "berlin", to: "munich", date: "2026-08-15", maxPrice: 80 }),
    query({ sort: "price_desc", page: 7 }),
  ])("survives serialise then parse: %j", (original) => {
    expect(parseSearchQuery(serializeSearchQuery(original))).toEqual(original);
  });
});

describe("buildSearchPath", () => {
  test("returns the bare path when there is nothing to encode", () => {
    expect(buildSearchPath(EMPTY_SEARCH_QUERY)).toBe("/trains");
  });

  test("appends the query string", () => {
    expect(buildSearchPath(query({ from: "berlin", to: "munich" }))).toBe(
      "/trains?from=berlin&to=munich",
    );
  });
});

describe("buildTrainPath", () => {
  test("carries the search so the way back lands where the user left", () => {
    expect(buildTrainPath("42", query({ from: "berlin", page: 3 }))).toBe(
      "/trains/42?from=berlin&page=3",
    );
  });

  test("omits an empty query string", () => {
    expect(buildTrainPath("42", EMPTY_SEARCH_QUERY)).toBe("/trains/42");
  });

  test("escapes an id so it cannot alter the path", () => {
    expect(buildTrainPath("../reset", EMPTY_SEARCH_QUERY)).toBe(
      "/trains/..%2Freset",
    );
  });
});

describe("withSearchQuery", () => {
  test("resets to page 1, because page 3 of the previous filter means nothing", () => {
    const current = query({ from: "berlin", page: 3 });

    expect(withSearchQuery(current, { maxPrice: 50 })).toMatchObject({
      from: "berlin",
      maxPrice: 50,
      page: 1,
    });
  });

  test("still allows paging explicitly", () => {
    expect(withSearchQuery(query({ page: 1 }), { page: 2 })).toMatchObject({
      page: 2,
    });
  });
});

describe("isValidIsoDate", () => {
  test("accepts a real date and rejects one that does not exist", () => {
    expect(isValidIsoDate("2026-08-15")).toBe(true);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
  });
});
