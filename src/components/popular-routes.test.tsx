import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { RoutePair } from "@/lib/api";

import { PopularRoutes } from "./popular-routes";

const pair = (
  fromSlug: string,
  toSlug: string,
  fromName: string,
  toName: string,
): RoutePair => ({ fromSlug, toSlug, fromName, toName, trains: 1 });

// A query-based URL scheme leaves a crawler no path structure to walk, so these
// links are the only way the route pages are discovered.
test("links to each route with the wording people search for", () => {
  render(
    <PopularRoutes pairs={[pair("berlin", "munich", "Berlin", "Munich")]} />,
  );

  expect(
    screen.getByRole("link", { name: "Berlin to Munich trains" }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich");
});

test("renders nothing rather than an empty heading", () => {
  const { container } = render(<PopularRoutes pairs={[]} />);

  expect(container).toBeEmptyDOMElement();
});
