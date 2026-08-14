import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ResultsSkeleton } from "./results-skeleton";

// The placeholders are decoration; a screen reader needs to be told that a
// search is running, not read four empty boxes.
test("announces that a search is in progress", () => {
  render(<ResultsSkeleton />);

  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Searching for trains");
  expect(status.querySelectorAll("[aria-hidden='true']")).toHaveLength(4);
});
