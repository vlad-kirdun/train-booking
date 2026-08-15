import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import { resetSavedTrainsCache, toggleSavedTrain } from "@/lib/saved-trains";
import { makeTrain } from "@/test/fixtures";

import { SavedTrainsPanel } from "./saved-trains-panel";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich", page: 3 };

beforeEach(() => {
  window.localStorage.clear();
  resetSavedTrainsCache();
});

// The server cannot know a device's shortlist, so the first render has to match
// what the server sent: nothing.
test("renders nothing when there is no shortlist", () => {
  const { container } = render(<SavedTrainsPanel query={query} />);

  expect(container).toBeEmptyDOMElement();
});

// The hydration guarantee, asserted rather than assumed: if the server ever
// rendered a shortlist it could not know about, the first client render would
// disagree with it and React would throw the whole tree away.
test("renders nothing on the server even when this device has a shortlist", () => {
  toggleSavedTrain(makeTrain({ id: "42" }));

  expect(renderToStaticMarkup(<SavedTrainsPanel query={query} />)).toBe("");
});

test("lists saved trains and links to each one", async () => {
  toggleSavedTrain(
    makeTrain({ id: "42", from: "Berlin", to: "Munich", price: 89 }),
  );

  render(<SavedTrainsPanel query={query} />);

  expect(
    await screen.findByRole("heading", { name: "Saved trains" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Berlin → Munich/ })).toHaveAttribute(
    "href",
    "/trains/42?from=berlin&to=munich&page=3",
  );
  expect(screen.getByText("€89")).toBeInTheDocument();
});

test("removes a train from the shortlist", async () => {
  const user = userEvent.setup();
  toggleSavedTrain(makeTrain({ id: "42" }));
  render(<SavedTrainsPanel query={query} />);

  await user.click(await screen.findByRole("button", { name: /^Remove/ }));

  expect(screen.queryByRole("heading", { name: "Saved trains" })).toBeNull();
});

// Accounts are next quarter; saying so is better than letting someone assume
// their shortlist follows them to another device.
test("says where the shortlist lives", async () => {
  toggleSavedTrain(makeTrain({ id: "42" }));
  render(<SavedTrainsPanel query={query} />);

  expect(await screen.findByText(/this device only/i)).toBeInTheDocument();
});
