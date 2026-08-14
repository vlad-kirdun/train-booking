import { afterEach, describe, expect, test, vi } from "vitest";

import { DEFAULT_API_BASE_URL, getApiBaseUrl } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiBaseUrl", () => {
  test("falls back to the public API so the project runs without configuration", () => {
    vi.stubEnv("TRAIN_API_BASE_URL", undefined);

    expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  test("treats a blank value as unset", () => {
    vi.stubEnv("TRAIN_API_BASE_URL", "   ");

    expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  test("uses the configured value", () => {
    vi.stubEnv("TRAIN_API_BASE_URL", "https://staging.example.test");

    expect(getApiBaseUrl()).toBe("https://staging.example.test");
  });

  test("strips trailing slashes so appended paths do not double up", () => {
    vi.stubEnv("TRAIN_API_BASE_URL", "https://staging.example.test///");

    expect(getApiBaseUrl()).toBe("https://staging.example.test");
  });
});
