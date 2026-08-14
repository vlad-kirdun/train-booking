import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HomePage from "./page";

test("renders the page heading", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Train search",
  );
});
