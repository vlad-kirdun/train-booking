import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";

import { EmptyPage, EmptyResults } from "./empty-results";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich" };

// "No results" alone leaves the user guessing which of four inputs is at fault.
test("offers to undo the budget and the date, one at a time", () => {
  render(
    <EmptyResults query={{ ...query, maxPrice: 40, date: "2026-08-15" }} />,
  );

  expect(
    screen.getByRole("link", { name: /without the €40 budget/ }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich&date=2026-08-15");
  expect(
    screen.getByRole("link", { name: /all dates instead of/ }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich&maxPrice=40");
});

test("suggests changing the route when no filter is to blame", () => {
  render(<EmptyResults query={query} />);

  expect(screen.queryAllByRole("link")).toEqual([]);
  expect(screen.getByText(/different pair of cities/)).toBeInTheDocument();
});

test("sends a too-far page number back to the first page", () => {
  render(<EmptyPage query={{ ...query, page: 99 }} />);

  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich",
  );
});
