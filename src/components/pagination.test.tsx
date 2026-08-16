import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";

import { Pagination } from "./pagination";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich" };

test("stays out of the way when everything fits on one page", () => {
  const { container } = render(
    <Pagination query={query} page={1} totalPages={1} />,
  );

  expect(container).toBeEmptyDOMElement();
});

test("links to the neighbouring pages and keeps the search", () => {
  render(<Pagination query={query} page={2} totalPages={3} />);

  expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich",
  );
  expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich&page=3",
  );
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

// A shared link to page 99 of 2 would otherwise offer 97 clicks through empty
// pages before reaching anything.
test("sends a page past the end back to the last page with results", () => {
  render(<Pagination query={query} page={99} totalPages={2} />);

  expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich&page=2",
  );
});

test("offers no link past either end", () => {
  const { rerender } = render(
    <Pagination query={query} page={1} totalPages={3} />,
  );
  expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();

  rerender(<Pagination query={query} page={3} totalPages={3} />);
  expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
});
