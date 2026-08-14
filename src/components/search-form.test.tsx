import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { EMPTY_SEARCH_QUERY, type SearchQuery } from "@/domain/search-query";
import type { Station } from "@/lib/api";

import { SearchForm } from "./search-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const stations: Station[] = [
  { slug: "berlin", code: "BER", name: "Berlin", country: "Germany" },
  { slug: "munich", code: "MUC", name: "Munich", country: "Germany" },
];

function renderForm(query: Partial<SearchQuery> = {}) {
  return render(
    <SearchForm
      stations={stations}
      query={{ ...EMPTY_SEARCH_QUERY, ...query }}
    />,
  );
}

beforeEach(() => {
  push.mockClear();
});

test("navigates to the search the user filled in", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.selectOptions(screen.getByLabelText("From"), "berlin");
  await user.selectOptions(screen.getByLabelText("To"), "munich");
  await user.type(screen.getByLabelText("Max price"), "80");
  await user.click(screen.getByRole("button", { name: "Search trains" }));

  expect(push).toHaveBeenCalledWith(
    "/trains?from=berlin&to=munich&maxPrice=80",
  );
});

// Empty inputs must not reach the URL, or every shared link would carry a
// trail of blank parameters and stop being the canonical form of that search.
test("leaves untouched fields out of the URL", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.selectOptions(screen.getByLabelText("From"), "berlin");
  await user.click(screen.getByRole("button", { name: "Search trains" }));

  expect(push).toHaveBeenCalledWith("/trains?from=berlin");
});

test("keeps the chosen sort order when filters change", async () => {
  const user = userEvent.setup();
  renderForm({ sort: "price_desc" });

  await user.selectOptions(screen.getByLabelText("From"), "berlin");
  await user.click(screen.getByRole("button", { name: "Search trains" }));

  expect(push).toHaveBeenCalledWith("/trains?from=berlin&sort=price_desc");
});

// Changing a filter invalidates the position in the old result set.
test("returns to the first page", async () => {
  const user = userEvent.setup();
  renderForm({ from: "berlin", to: "munich", page: 4 });

  await user.click(screen.getByRole("button", { name: "Search trains" }));

  expect(push).toHaveBeenCalledWith("/trains?from=berlin&to=munich");
});

test("swaps the two stations", async () => {
  const user = userEvent.setup();
  renderForm({ from: "berlin", to: "munich" });

  await user.click(
    screen.getByRole("button", { name: "Swap departure and arrival" }),
  );
  await user.click(screen.getByRole("button", { name: "Search trains" }));

  expect(push).toHaveBeenCalledWith("/trains?from=munich&to=berlin");
});

test("still submits as a plain GET form without JavaScript", () => {
  const { container } = renderForm();
  const form = container.querySelector("form");

  expect(form).toHaveAttribute("method", "get");
  expect(form).toHaveAttribute("action", "/trains");
});
