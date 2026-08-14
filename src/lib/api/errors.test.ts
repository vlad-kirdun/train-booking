import { describe, expect, test } from "vitest";

import { ApiError, isApiError, isRetryable } from "./errors";

const error = (kind: ApiError["kind"]) => new ApiError({ kind, message: kind });

describe("isApiError", () => {
  test("recognises an ApiError", () => {
    expect(isApiError(error("conflict"))).toBe(true);
  });

  test("rejects anything else, including a plain Error", () => {
    expect(isApiError(new Error("boom"))).toBe(false);
    expect(isApiError("conflict")).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe("isRetryable", () => {
  test.each(["network", "timeout", "server_error"] as const)(
    "retries %s",
    (kind) => {
      expect(isRetryable(error(kind))).toBe(true);
    },
  );

  // Replaying these produces the same failure and only delays the error the
  // user is going to see anyway.
  test.each([
    "bad_request",
    "not_found",
    "conflict",
    "invalid_response",
  ] as const)("does not retry %s", (kind) => {
    expect(isRetryable(error(kind))).toBe(false);
  });
});

test("keeps the API's own message and the underlying cause", () => {
  const cause = new Error("socket closed");
  const apiError = new ApiError({
    kind: "conflict",
    message: "POST /bookings failed with 409",
    status: 409,
    detail: "Not enough seats left on this train",
    cause,
  });

  expect(apiError.name).toBe("ApiError");
  expect(apiError.status).toBe(409);
  expect(apiError.detail).toBe("Not enough seats left on this train");
  expect(apiError.cause).toBe(cause);
});
