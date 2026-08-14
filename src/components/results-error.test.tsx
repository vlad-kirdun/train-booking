import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import { ApiError } from "@/lib/api";

import { ResultsError } from "./results-error";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich" };

test("explains what happened and offers to retry the same search", () => {
  render(
    <ResultsError
      error={new ApiError({ kind: "timeout", message: "timed out" })}
      query={query}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "This is taking longer than usual",
  );
  expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/trains?from=berlin&to=munich",
  );
});

test("tells an unreachable service apart from a slow one", () => {
  render(
    <ResultsError
      error={new ApiError({ kind: "network", message: "offline" })}
      query={query}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "We could not reach the timetable service",
  );
});

// Offering a retry for something a retry cannot fix is how an error state
// turns into a loop.
test("offers no retry when trying again cannot help", () => {
  render(
    <ResultsError
      error={new ApiError({ kind: "bad_request", message: "nope" })}
      query={query}
    />,
  );

  expect(screen.queryByRole("link", { name: "Try again" })).toBeNull();
});

// A full document request, so it works without JavaScript and cannot replay a
// stale client cache.
test("retries with a plain link rather than a router call", () => {
  render(
    <ResultsError
      error={new ApiError({ kind: "server_error", message: "500" })}
      query={query}
    />,
  );

  expect(screen.getByRole("link", { name: "Try again" }).tagName).toBe("A");
});
