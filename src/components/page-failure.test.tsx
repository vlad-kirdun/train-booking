import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ApiError } from "@/lib/api";

import { PageFailure } from "./page-failure";

// This exists because a client error boundary would leave the document body
// empty until hydration — a blank first paint is the failure mode the loading
// and error states are meant to prevent.
test("renders the failure and a way back into the same search", () => {
  render(
    <PageFailure
      error={new ApiError({ kind: "network", message: "offline" })}
      retryHref="/trains?from=berlin&to=munich"
    />,
  );

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "We could not reach the timetable service",
  );
  expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "still in the address bar",
  );
});

test("offers no retry for a failure a retry cannot fix", () => {
  render(
    <PageFailure
      error={new ApiError({ kind: "not_found", message: "gone" })}
      retryHref="/trains"
    />,
  );

  expect(screen.queryByRole("link", { name: "Try again" })).toBeNull();
});
