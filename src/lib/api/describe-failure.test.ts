import { describe, expect, test } from "vitest";

import { describeApiFailure } from "./describe-failure";
import { ApiError, type ApiErrorKind } from "./errors";

const describeKind = (kind: ApiErrorKind) =>
  describeApiFailure(new ApiError({ kind, message: kind }));

describe("retryable failures", () => {
  test.each([
    "timeout",
    "network",
    "server_error",
    "invalid_response",
  ] as const)("%s offers a retry", (kind) => {
    expect(describeKind(kind).retryable).toBe(true);
  });

  // A slow API and an unreachable one call for different sentences; collapsing
  // them into one generic message is what makes a site look broken.
  test("distinguishes a slow service from an unreachable one", () => {
    expect(describeKind("timeout").title).not.toBe(
      describeKind("network").title,
    );
  });

  test("says a timeout is often transient, since the API cold-starts", () => {
    expect(describeKind("timeout").detail).toMatch(/trying again/i);
  });

  test("does not blame the user for a server error", () => {
    expect(describeKind("server_error").detail).toMatch(/their side/i);
  });
});

describe("failures a retry cannot fix", () => {
  test.each(["conflict", "not_found", "bad_request"] as const)(
    "%s does not offer a retry",
    (kind) => {
      expect(describeKind(kind).retryable).toBe(false);
    },
  );

  test("points a lost seat towards the other trains", () => {
    expect(describeKind("conflict").detail).toMatch(/another train/i);
  });
});

test("describes an error that is not ours at all", () => {
  const description = describeApiFailure(new Error("boom"));

  expect(description.title).toBe("Something went wrong");
  expect(description.retryable).toBe(true);
});

test("survives something that is not an error object", () => {
  expect(describeApiFailure("boom").retryable).toBe(true);
});
