import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";

import { SortLinks } from "./sort-links";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich" };

// Every ordering is its own address, so it can be shared, crawled and reached
// with the back button.
test("links to each ordering while keeping the rest of the search", () => {
  render(<SortLinks query={query} />);

  expect(screen.getByRole("link", { name: "Cheapest first" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich",
  );
  expect(
    screen.getByRole("link", { name: "Most expensive first" }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich&sort=price_desc");
});

test("marks the ordering currently in effect", () => {
  render(<SortLinks query={{ ...query, sort: "price_desc" }} />);

  expect(
    screen.getByRole("link", { name: "Most expensive first" }),
  ).toHaveAttribute("aria-current", "true");
  expect(
    screen.getByRole("link", { name: "Cheapest first" }),
  ).not.toHaveAttribute("aria-current");
});

// Changing the ordering reshuffles the whole result set, so page 4 of the old
// order points at different trains.
test("returns to the first page when the ordering changes", () => {
  render(<SortLinks query={{ ...query, page: 4 }} />);

  expect(
    screen.getByRole("link", { name: "Most expensive first" }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich&sort=price_desc");
});
